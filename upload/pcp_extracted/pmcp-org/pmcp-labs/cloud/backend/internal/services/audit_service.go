package services

import (
	"context"
	"fmt"
	"sync"
	"time"

	"pmcp-cloud/internal/config"
	"pmcp-cloud/internal/models"
)

type AuditService struct {
	cfg    *config.Config
	mu     sync.RWMutex
	events []*models.AuditEvent
	maxSize int
}

func NewAuditService(cfg *config.Config) *AuditService {
	maxSize := 10000
	if cfg.Metrics.RetentionDays > 0 {
		maxSize = cfg.Metrics.RetentionDays * 1000
	}
	if maxSize > 100000 {
		maxSize = 100000
	}

	return &AuditService{
		cfg:     cfg,
		events:  make([]*models.AuditEvent, 0),
		maxSize: maxSize,
	}
}

func (s *AuditService) Log(event *models.AuditEvent) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if event.EventID == "" {
		event.EventID = fmt.Sprintf("audit-%d-%s", time.Now().Unix(), generateID(8))
	}
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}
	if event.Details == nil {
		event.Details = make(map[string]interface{})
	}

	s.events = append(s.events, event)

	if len(s.events) > s.maxSize {
		trim := len(s.events) - s.maxSize/2
		s.events = s.events[trim:]
	}

	return nil
}

func (s *AuditService) Query(ctx context.Context, action *models.AuditAction, actor, targetType string, startTime, endTime *time.Time, limit int) ([]*models.AuditEvent, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if limit <= 0 {
		limit = 100
	}
	if limit > 1000 {
		limit = 1000
	}

	result := make([]*models.AuditEvent, 0)
	for i := len(s.events) - 1; i >= 0 && len(result) < limit; i-- {
		event := s.events[i]

		if action != nil && event.Action != *action {
			continue
		}
		if actor != "" && event.Actor != actor {
			continue
		}
		if targetType != "" && event.TargetType != targetType {
			continue
		}
		if startTime != nil && event.Timestamp.Before(*startTime) {
			continue
		}
		if endTime != nil && event.Timestamp.After(*endTime) {
			continue
		}

		result = append(result, event)
	}

	return result, nil
}

func (s *AuditService) GetByID(ctx context.Context, eventID string) (*models.AuditEvent, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, event := range s.events {
		if event.EventID == eventID {
			return event, nil
		}
	}

	return nil, fmt.Errorf("event not found: %s", eventID)
}

func (s *AuditService) GetComplianceReport(ctx context.Context, startTime, endTime time.Time) (map[string]interface{}, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	events := make([]*models.AuditEvent, 0)
	for _, event := range s.events {
		if !event.Timestamp.Before(startTime) && !event.Timestamp.After(endTime) {
			events = append(events, event)
		}
	}

	actionCounts := make(map[string]int)
	actorCounts := make(map[string]int)
	targetTypeCounts := make(map[string]int)
	hourlyCounts := make(map[string]int)

	for _, event := range events {
		actionCounts[string(event.Action)]++
		actorCounts[event.Actor]++
		targetTypeCounts[event.TargetType]++

		hour := event.Timestamp.Format("2006-01-02 15")
		hourlyCounts[hour]++
	}

	return map[string]interface{}{
		"period": map[string]interface{}{
			"start": startTime,
			"end":   endTime,
		},
		"totalEvents":     len(events),
		"byAction":        actionCounts,
		"byActor":         actorCounts,
		"byTargetType":    targetTypeCounts,
		"byHour":          hourlyCounts,
		"uniqueActors":    len(actorCounts),
		"uniqueTargets":   len(targetTypeCounts),
	}, nil
}

func (s *AuditService) LogRobotRegister(ctx context.Context, actor, robotID, details string) error {
	return s.Log(&models.AuditEvent{
		EventID:    "",
		Action:     models.AuditActionCreate,
		Actor:      actor,
		TargetType: "robot",
		TargetID:   robotID,
		Details:    map[string]interface{}{"action": "register", "info": details},
	})
}

func (s *AuditService) LogRobotUpdate(ctx context.Context, actor, robotID string, changes map[string]interface{}) error {
	return s.Log(&models.AuditEvent{
		EventID:    "",
		Action:     models.AuditActionUpdate,
		Actor:      actor,
		TargetType: "robot",
		TargetID:   robotID,
		Details:    changes,
	})
}

func (s *AuditService) LogRobotDelete(ctx context.Context, actor, robotID string) error {
	return s.Log(&models.AuditEvent{
		EventID:    "",
		Action:     models.AuditActionDelete,
		Actor:      actor,
		TargetType: "robot",
		TargetID:   robotID,
	})
}

func (s *AuditService) LogCommand(ctx context.Context, actor, robotID, command string, params map[string]interface{}) error {
	return s.Log(&models.AuditEvent{
		EventID:    "",
		Action:     models.AuditActionCommand,
		Actor:      actor,
		TargetType: "robot",
		TargetID:   robotID,
		Details:    map[string]interface{}{"command": command, "parameters": params},
	})
}

func (s *AuditService) LogLogin(ctx context.Context, actor, ipAddress string) error {
	return s.Log(&models.AuditEvent{
		EventID:    "",
		Action:     models.AuditActionLogin,
		Actor:      actor,
		TargetType: "session",
		TargetID:   actor,
		Details:    map[string]interface{}{"ip": ipAddress},
		IPAddress:  ipAddress,
	})
}

func (s *AuditService) LogConfigChange(ctx context.Context, actor, targetType, targetID string, changes map[string]interface{}) error {
	return s.Log(&models.AuditEvent{
		EventID:    "",
		Action:     models.AuditActionConfigChange,
		Actor:      actor,
		TargetType: targetType,
		TargetID:   targetID,
		Details:    changes,
	})
}

func generateID(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	result := make([]byte, length)
	for i := range result {
		result[i] = charset[i%len(charset)]
	}
	return string(result)
}