package services

import (
	"context"
	"fmt"
	"sync"
	"time"

	"pmcp-cloud/internal/config"
	"pmcp-cloud/internal/models"
)

type OnboardingService struct {
	cfg      *config.Config
	mu       sync.RWMutex
	sessions map[string]*models.OnboardingSession
}

type OnboardingStep struct {
	Index    int    `json:"index"`
	Name     string `json:"name"`
	Title    string `json:"title"`
	Desc     string `json:"description"`
	Checklist []string `json:"checklist"`
}

func NewOnboardingService(cfg *config.Config) *OnboardingService {
	svc := &OnboardingService{
		cfg:      cfg,
		sessions: make(map[string]*models.OnboardingSession),
	}
	return svc
}

func (s *OnboardingService) GetSteps() []OnboardingStep {
	return []OnboardingStep{
		{
			Index:  1,
			Name:   "verify_connection",
			Title:  "Verify Connection",
			Desc:   "Ensure the robot can communicate with the P-MCP server",
			Checklist: []string{
				"Check network connectivity",
				"Verify P-MCP server is reachable",
				"Confirm robot IP address",
			},
		},
		{
			Index:  2,
			Name:   "detect_capabilities",
			Title:  "Detect Capabilities",
			Desc:   "Automatically detect robot sensors and actuators",
			Checklist: []string{
				"Scan for available sensors",
				"Detect motion capabilities",
				"Identify communication interfaces",
			},
		},
		{
			Index:  3,
			Name:   "configure_zone",
			Title:  "Configure Zone",
			Desc:   "Assign the robot to a fleet management zone",
			Checklist: []string{
				"Select zone from dropdown",
				"Set zone boundaries",
				"Configure zone-specific parameters",
			},
		},
		{
			Index:  4,
			Name:   "calibrate_sensors",
			Title:  "Calibrate Sensors",
			Desc:   "Run sensor calibration routines",
			Checklist: []string{
				"Calibrate LiDAR if present",
				"Calibrate cameras",
				"Verify IMU orientation",
			},
		},
		{
			Index:  5,
			Name:   "verify_operation",
			Title:  "Verify Operation",
			Desc:   "Run basic operation tests",
			Checklist: []string{
				"Test basic movement",
				"Verify telemetry reporting",
				"Confirm emergency stop works",
			},
		},
	}
}

func (s *OnboardingService) StartSession(ctx context.Context, robotID string) (*models.OnboardingSession, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	steps := s.GetSteps()
	sessionID := fmt.Sprintf("onboarding-%s", generateID(12))

	session := &models.OnboardingSession{
		SessionID:   sessionID,
		RobotID:    robotID,
		State:       models.OnboardingStateStart,
		CurrentStep: 1,
		TotalSteps:  len(steps),
		StepData:    make(map[string]interface{}),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	s.sessions[sessionID] = session
	return session, nil
}

func (s *OnboardingService) GetSession(ctx context.Context, sessionID string) (*models.OnboardingSession, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	session, ok := s.sessions[sessionID]
	if !ok {
		return nil, fmt.Errorf("session not found: %s", sessionID)
	}

	return session, nil
}

func (s *OnboardingService) NextStep(ctx context.Context, sessionID string, data map[string]interface{}) (*models.OnboardingSession, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	session, ok := s.sessions[sessionID]
	if !ok {
		return nil, fmt.Errorf("session not found: %s", sessionID)
	}

	if session.CompletedAt != nil {
		return nil, fmt.Errorf("session already completed: %s", sessionID)
	}

	for k, v := range data {
		session.StepData[k] = v
	}

	session.CurrentStep++
	session.UpdatedAt = time.Now()

	if session.CurrentStep > session.TotalSteps {
		session.State = models.OnboardingStateComplete
		session.CompletedAt = new(time.Time)
		*session.CompletedAt = time.Now()
	} else {
		session.State = models.OnboardingState(s.GetSteps()[session.CurrentStep-1].Name)
	}

	s.sessions[sessionID] = session
	return session, nil
}

func (s *OnboardingService) Complete(ctx context.Context, sessionID string) (*models.OnboardingSession, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	session, ok := s.sessions[sessionID]
	if !ok {
		return nil, fmt.Errorf("session not found: %s", sessionID)
	}

	session.State = models.OnboardingStateComplete
	session.CurrentStep = session.TotalSteps
	session.CompletedAt = new(time.Time)
	*session.CompletedAt = time.Now()
	session.UpdatedAt = time.Now()

	s.sessions[sessionID] = session
	return session, nil
}

func (s *OnboardingService) Cancel(ctx context.Context, sessionID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.sessions[sessionID]; !ok {
		return fmt.Errorf("session not found: %s", sessionID)
	}

	delete(s.sessions, sessionID)
	return nil
}

func (s *OnboardingService) List(ctx context.Context) ([]*models.OnboardingSession, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]*models.OnboardingSession, 0, len(s.sessions))
	for _, session := range s.sessions {
		result = append(result, session)
	}

	return result, nil
}

func (s *OnboardingService) GetByRobot(ctx context.Context, robotID string) (*models.OnboardingSession, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, session := range s.sessions {
		if session.RobotID == robotID && session.CompletedAt == nil {
			return session, nil
		}
	}

	return nil, fmt.Errorf("no active session for robot: %s", robotID)
}

func (s *OnboardingService) ValidateStep(ctx context.Context, stepIndex int, data map[string]interface{}) error {
	steps := s.GetSteps()
	if stepIndex < 1 || stepIndex > len(steps) {
		return fmt.Errorf("invalid step index: %d", stepIndex)
	}

	step := steps[stepIndex-1]

	switch step.Name {
	case "verify_connection":
		if connected, ok := data["connected"].(bool); !ok || !connected {
			return fmt.Errorf("connection not verified")
		}
	case "detect_capabilities":
		if caps, ok := data["capabilities"].([]string); !ok || len(caps) == 0 {
			return fmt.Errorf("no capabilities detected")
		}
	case "configure_zone":
		if zone, ok := data["zoneId"].(string); !ok || zone == "" {
			return fmt.Errorf("zone not configured")
		}
	case "calibrate_sensors":
		if calibrated, ok := data["calibrated"].(bool); !ok || !calibrated {
			return fmt.Errorf("sensors not calibrated")
		}
	case "verify_operation":
		if verified, ok := data["verified"].(bool); !ok || !verified {
			return fmt.Errorf("operation not verified")
		}
	}

	return nil
}