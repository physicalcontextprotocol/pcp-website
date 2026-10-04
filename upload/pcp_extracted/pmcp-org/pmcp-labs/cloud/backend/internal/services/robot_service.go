package services

import (
	"context"
	"fmt"
	"sync"
	"time"

	"pmcp-cloud/internal/config"
	"pmcp-cloud/internal/models"

	"gopkg.in/mgo.v2/bson"
)

type RobotService struct {
	cfg   *config.Config
	mu    sync.RWMutex
	robots map[string]*models.Robot
}

func NewRobotService(cfg *config.Config) *RobotService {
	svc := &RobotService{
		cfg:    cfg,
		robots: make(map[string]*models.Robot),
	}
	svc.initializeDefaultRobots()
	return svc
}

func (s *RobotService) initializeDefaultRobots() {
	defaultRobots := []models.Robot{
		{
			RobotID:         "robot-001",
			Name:            "TurtleBot 3",
			RobotType:       "turtlebot3",
			Status:          models.RobotStatusOnline,
			Zone:            "zone-default",
			Capabilities:    []string{"navigation", "slam", "object_detection"},
			HealthScore:     95.5,
			LastSeen:         time.Now(),
			RegisteredAt:     time.Now().Add(-24 * time.Hour),
		},
		{
			RobotID:         "robot-002",
			Name:            "UR5 Arm",
			RobotType:       "ur5",
			Status:          models.RobotStatusOnline,
			Zone:            "zone-warehouse-a",
			Capabilities:    []string{"manipulation", "pick_place", "vision"},
			HealthScore:     88.0,
			LastSeen:         time.Now().Add(-5 * time.Second),
			RegisteredAt:     time.Now().Add(-48 * time.Hour),
		},
		{
			RobotID:         "robot-003",
			Name:            "OTTO 100",
			RobotType:       "otto100",
			Status:          models.RobotStatusOffline,
			Zone:            "zone-warehouse-b",
			Capabilities:    []string{"transport", "navigation"},
			HealthScore:     0,
			LastSeen:         time.Now().Add(-3600 * time.Second),
			RegisteredAt:     time.Now().Add(-72 * time.Hour),
		},
	}
	for i := range defaultRobots {
		s.robots[defaultRobots[i].RobotID] = &defaultRobots[i]
	}
}

func (s *RobotService) Register(ctx context.Context, robot *models.Robot) (*models.Robot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if robot.RobotID == "" {
		robot.RobotID = fmt.Sprintf("robot-%s", bson.NewObjectId().Hex()[:8])
	}
	if robot.Status == "" {
		robot.Status = models.RobotStatusPending
	}
	if robot.RegisteredAt.IsZero() {
		robot.RegisteredAt = time.Now()
	}
	if robot.Metadata == nil {
		robot.Metadata = make(map[string]string)
	}

	s.robots[robot.RobotID] = robot
	return robot, nil
}

func (s *RobotService) Get(ctx context.Context, robotID string) (*models.Robot, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	robot, ok := s.robots[robotID]
	if !ok {
		return nil, fmt.Errorf("robot not found: %s", robotID)
	}
	return robot, nil
}

func (s *RobotService) Update(ctx context.Context, robot *models.Robot) (*models.Robot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.robots[robot.RobotID]; !ok {
		return nil, fmt.Errorf("robot not found: %s", robot.RobotID)
	}

	s.robots[robot.RobotID] = robot
	return robot, nil
}

func (s *RobotService) Delete(ctx context.Context, robotID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.robots[robotID]; !ok {
		return fmt.Errorf("robot not found: %s", robotID)
	}

	delete(s.robots, robotID)
	return nil
}

func (s *RobotService) List(ctx context.Context, status *models.RobotStatus, zone string) ([]*models.Robot, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []*models.Robot
	for _, robot := range s.robots {
		if status != nil && robot.Status != *status {
			continue
		}
		if zone != "" && robot.Zone != zone {
			continue
		}
		result = append(result, robot)
	}
	return result, nil
}

func (s *RobotService) UpdateTelemetry(ctx context.Context, robotID string, telemetry *models.Telemetry) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	robot, ok := s.robots[robotID]
	if !ok {
		return fmt.Errorf("robot not found: %s", robotID)
	}

	robot.Position = telemetry.Position
	robot.Orientation = telemetry.Orientation
	robot.Velocity = telemetry.Velocity
	robot.LastSeen = telemetry.Timestamp
	robot.HealthScore = s.calculateHealthScore(telemetry)

	if robot.Status == models.RobotStatusPending || robot.Status == models.RobotStatusOffline {
		robot.Status = models.RobotStatusOnline
	}

	s.robots[robotID] = robot
	return nil
}

func (s *RobotService) calculateHealthScore(telemetry *models.Telemetry) float64 {
	score := 100.0

	if telemetry.Battery < 20 {
		score -= 20
	} else if telemetry.Battery < 50 {
		score -= 10
	}

	if telemetry.Temperature > 80 {
		score -= 15
	} else if telemetry.Temperature > 60 {
		score -= 5
	}

	speed := telemetry.Velocity.VX + telemetry.Velocity.VY + telemetry.Velocity.VZ
	if speed > 2.0 {
		score -= 10
	}

	if score < 0 {
		score = 0
	}
	return score
}

func (s *RobotService) GetStats(ctx context.Context) (*models.FleetStats, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	stats := &models.FleetStats{
		TotalRobots: len(s.robots),
	}

	var totalHealth float64
	var onlineCount int

	for _, robot := range s.robots {
		switch robot.Status {
		case models.RobotStatusOnline:
			stats.OnlineRobots++
			onlineCount++
		case models.RobotStatusOffline:
			stats.OfflineRobots++
		case models.RobotStatusError:
			stats.ErrorRobots++
		case models.RobotStatusPending:
			stats.PendingRobots++
		}
		totalHealth += robot.HealthScore
	}

	if onlineCount > 0 {
		stats.AvgHealthScore = totalHealth / float64(onlineCount)
	}

	return stats, nil
}

func (s *RobotService) AssignZone(ctx context.Context, robotID, zoneID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	robot, ok := s.robots[robotID]
	if !ok {
		return fmt.Errorf("robot not found: %s", robotID)
	}

	robot.Zone = zoneID
	s.robots[robotID] = robot
	return nil
}

func (s *RobotService) ExecuteCommand(ctx context.Context, robotID string, cmd string, params map[string]interface{}) (string, error) {
	s.mu.RLock()
	robot, ok := s.robots[robotID]
	s.mu.RUnlock()

	if !ok {
		return "", fmt.Errorf("robot not found: %s", robotID)
	}

	if robot.Status != models.RobotStatusOnline {
		return "", fmt.Errorf("robot is not online: %s", robotID)
	}

	commandID := fmt.Sprintf("cmd-%s", bson.NewObjectId().Hex()[:12])
	return commandID, nil
}