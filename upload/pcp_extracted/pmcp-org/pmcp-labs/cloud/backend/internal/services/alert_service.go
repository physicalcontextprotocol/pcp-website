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

type AlertService struct {
	cfg    *config.Config
	mu     sync.RWMutex
	alerts map[string]*models.Alert
	rules  []AlertRule
}

type AlertRule struct {
	RuleID       string             `json:"ruleId"`
	Name         string             `json:"name"`
	Condition    string             `json:"condition"`
	Severity     models.AlertSeverity `json:"severity"`
	Enabled      bool               `json:"enabled"`
	CooldownSecs int                `json:"cooldownSecs"`
}

func NewAlertService(cfg *config.Config) *AlertService {
	svc := &AlertService{
		cfg:    cfg,
		alerts: make(map[string]*models.Alert),
		rules:  make([]AlertRule, 0),
	}
	svc.initializeDefaultAlerts()
	svc.initializeDefaultRules()
	return svc
}

func (s *AlertService) initializeDefaultAlerts() {
	defaultAlerts := []models.Alert{
		{
			AlertID:   "alert-001",
			Severity:  models.AlertSeverityWarning,
			Title:     "Low battery",
			Message:   "Robot robot-001 battery is below 20%",
			Source:    "system",
			RobotID:   strPtr("robot-001"),
			CreatedAt: time.Now().Add(-30 * time.Minute),
		},
		{
			AlertID:   "alert-002",
			Severity:  models.AlertSeverityInfo,
			Title:     "Robot connected",
			Message:   "Robot robot-002 connected successfully",
			Source:    "system",
			RobotID:   strPtr("robot-002"),
			CreatedAt: time.Now().Add(-5 * time.Minute),
			Resolved:  true,
			ResolvedAt: timePtr(time.Now().Add(-3 * time.Minute)),
		},
	}
	for i := range defaultAlerts {
		s.alerts[defaultAlerts[i].AlertID] = &defaultAlerts[i]
	}
}

func (s *AlertService) initializeDefaultRules() {
	s.rules = []AlertRule{
		{
			RuleID:       "rule-battery-low",
			Name:         "Low Battery Alert",
			Condition:    "battery < 20",
			Severity:     models.AlertSeverityWarning,
			Enabled:      true,
			CooldownSecs: 300,
		},
		{
			RuleID:       "rule-battery-critical",
			Name:         "Critical Battery Alert",
			Condition:    "battery < 10",
			Severity:     models.AlertSeverityCritical,
			Enabled:      true,
			CooldownSecs: 60,
		},
		{
			RuleID:       "rule-offline",
			Name:         "Robot Offline Alert",
			Condition:    "status == offline",
			Severity:     models.AlertSeverityWarning,
			Enabled:      true,
			CooldownSecs: 600,
		},
		{
			RuleID:       "rule-error",
			Name:         "Robot Error Alert",
			Condition:    "status == error",
			Severity:     models.AlertSeverityError,
			Enabled:      true,
			CooldownSecs: 60,
		},
		{
			RuleID:       "rule-temp-high",
			Name:         "High Temperature Alert",
			Condition:    "temperature > 80",
			Severity:     models.AlertSeverityCritical,
			Enabled:      true,
			CooldownSecs: 30,
		},
	}
}

func (s *AlertService) Create(ctx context.Context, alert *models.Alert) (*models.Alert, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if alert.AlertID == "" {
		alert.AlertID = fmt.Sprintf("alert-%s", bson.NewObjectId().Hex()[:8])
	}
	if alert.CreatedAt.IsZero() {
		alert.CreatedAt = time.Now()
	}
	if alert.Metadata == nil {
		alert.Metadata = make(map[string]interface{})
	}

	s.alerts[alert.AlertID] = alert
	return alert, nil
}

func (s *AlertService) Get(ctx context.Context, alertID string) (*models.Alert, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	alert, ok := s.alerts[alertID]
	if !ok {
		return nil, fmt.Errorf("alert not found: %s", alertID)
	}
	return alert, nil
}

func (s *AlertService) List(ctx context.Context, robotID *string, severity *models.AlertSeverity, acknowledged, resolved *bool) ([]*models.Alert, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]*models.Alert, 0)
	for _, alert := range s.alerts {
		if robotID != nil && (alert.RobotID == nil || *alert.RobotID != *robotID) {
			continue
		}
		if severity != nil && alert.Severity != *severity {
			continue
		}
		if acknowledged != nil && alert.Acknowledged != *acknowledged {
			continue
		}
		if resolved != nil && alert.Resolved != *resolved {
			continue
		}
		result = append(result, alert)
	}

	return result, nil
}

func (s *AlertService) Acknowledge(ctx context.Context, alertID, user string) (*models.Alert, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	alert, ok := s.alerts[alertID]
	if !ok {
		return nil, fmt.Errorf("alert not found: %s", alertID)
	}

	alert.Acknowledged = true
	alert.AcknowledgedBy = &user
	now := time.Now()
	alert.AcknowledgedAt = &now

	s.alerts[alertID] = alert
	return alert, nil
}

func (s *AlertService) Resolve(ctx context.Context, alertID string) (*models.Alert, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	alert, ok := s.alerts[alertID]
	if !ok {
		return nil, fmt.Errorf("alert not found: %s", alertID)
	}

	alert.Resolved = true
	now := time.Now()
	alert.ResolvedAt = &now

	s.alerts[alertID] = alert
	return alert, nil
}

func (s *AlertService) EvaluateRules(ctx context.Context, robotData map[string]interface{}) []*models.Alert {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var alerts []*models.Alert

	for _, rule := range s.rules {
		if !rule.Enabled {
			continue
		}

		if evaluateCondition(rule.Condition, robotData) {
			alert := &models.Alert{
				AlertID:   fmt.Sprintf("alert-%s", bson.NewObjectId().Hex()[:8]),
				Severity:  rule.Severity,
				Title:     rule.Name,
				Message:   fmt.Sprintf("Alert rule triggered: %s", rule.Condition),
				Source:    fmt.Sprintf("rule:%s", rule.RuleID),
				CreatedAt: time.Now(),
				Metadata:  robotData,
			}

			if robotID, ok := robotData["robotId"].(string); ok {
				alert.RobotID = &robotID
			}
			if zoneID, ok := robotData["zoneId"].(string); ok {
				alert.ZoneID = &zoneID
			}

			s.alerts[alert.AlertID] = alert
			alerts = append(alerts, alert)
		}
	}

	return alerts
}

func evaluateCondition(condition string, data map[string]interface{}) bool {
	return true
}

func (s *AlertService) GetStats(ctx context.Context) (map[string]int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	stats := map[string]int{
		"total":       len(s.alerts),
		"active":      0,
		"acknowledged": 0,
		"resolved":    0,
		"critical":    0,
		"error":       0,
		"warning":     0,
		"info":        0,
	}

	for _, alert := range s.alerts {
		if !alert.Resolved {
			stats["active"]++
		}
		if alert.Acknowledged {
			stats["acknowledged"]++
		}
		if alert.Resolved {
			stats["resolved"]++
		}
		switch alert.Severity {
		case models.AlertSeverityCritical:
			stats["critical"]++
		case models.AlertSeverityError:
			stats["error"]++
		case models.AlertSeverityWarning:
			stats["warning"]++
		case models.AlertSeverityInfo:
			stats["info"]++
		}
	}

	return stats, nil
}

func strPtr(s string) *string {
	return &s
}

func timePtr(t time.Time) *time.Time {
	return &t
}