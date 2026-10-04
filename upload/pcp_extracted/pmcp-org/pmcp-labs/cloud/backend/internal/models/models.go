package models

import (
	"time"

	"gopkg.in/mgo.v2/bson"
)

type RobotStatus string

const (
	RobotStatusPending     RobotStatus = "pending"
	RobotStatusRegistered  RobotStatus = "registered"
	RobotStatusOnline      RobotStatus = "online"
	RobotStatusOffline     RobotStatus = "offline"
	RobotStatusError       RobotStatus = "error"
	RobotStatusMaintenance RobotStatus = "maintenance"
)

type Robot struct {
	ID              bson.ObjectId     `json:"id" bson:"_id,omitempty"`
	RobotID         string            `json:"robotId" bson:"robot_id"`
	Name            string            `json:"name" bson:"name"`
	RobotType       string            `json:"robotType" bson:"robot_type"`
	SerialNumber    string            `json:"serialNumber" bson:"serial_number"`
	FirmwareVersion string            `json:"firmwareVersion" bson:"firmware_version"`
	Status          RobotStatus       `json:"status" bson:"status"`
	Zone            string            `json:"zone" bson:"zone"`
	Capabilities    []string          `json:"capabilities" bson:"capabilities"`
	Metadata        map[string]string `json:"metadata" bson:"metadata"`
	Position        Position          `json:"position" bson:"position"`
	Orientation     Orientation       `json:"orientation" bson:"orientation"`
	Velocity        Velocity           `json:"velocity" bson:"velocity"`
	LastSeen        time.Time         `json:"lastSeen" bson:"last_seen"`
	RegisteredAt    time.Time         `json:"registeredAt" bson:"registered_at"`
	OnboardedAt     *time.Time        `json:"onboardedAt" bson:"onboarded_at"`
	HealthScore     float64           `json:"healthScore" bson:"health_score"`
}

type Position struct {
	X float64 `json:"x" bson:"x"`
	Y float64 `json:"y" bson:"y"`
	Z float64 `json:"z" bson:"z"`
}

type Orientation struct {
	X float64 `json:"x" bson:"x"`
	Y float64 `json:"y" bson:"y"`
	Z float64 `json:"z" bson:"z"`
	W float64 `json:"w" bson:"w"`
}

type Velocity struct {
	VX    float64 `json:"vx" bson:"vx"`
	VY    float64 `json:"vy" bson:"vy"`
	VZ    float64 `json:"vz" bson:"vz"`
	Omega float64 `json:"omega" bson:"omega"`
}

type Zone struct {
	ID          bson.ObjectId    `json:"id" bson:"_id,omitempty"`
	ZoneID      string           `json:"zoneId" bson:"zone_id"`
	Name        string           `json:"name" bson:"name"`
	Description string           `json:"description" bson:"description"`
	Bounds      ZoneBounds       `json:"bounds" bson:"bounds"`
	Robots      []string         `json:"robots" bson:"robots"`
	Metadata    map[string]string `json:"metadata" bson:"metadata"`
	CreatedAt   time.Time        `json:"createdAt" bson:"created_at"`
}

type ZoneBounds struct {
	MinX float64 `json:"minX" bson:"min_x"`
	MaxX float64 `json:"maxX" bson:"max_x"`
	MinY float64 `json:"minY" bson:"min_y"`
	MaxY float64 `json:"maxY" bson:"max_y"`
	MinZ float64 `json:"minZ" bson:"min_z"`
	MaxZ float64 `json:"maxZ" bson:"max_z"`
}

type AlertSeverity string

const (
	AlertSeverityInfo     AlertSeverity = "info"
	AlertSeverityWarning  AlertSeverity = "warning"
	AlertSeverityError    AlertSeverity = "error"
	AlertSeverityCritical AlertSeverity = "critical"
)

type Alert struct {
	ID             bson.ObjectId   `json:"id" bson:"_id,omitempty"`
	AlertID        string          `json:"alertId" bson:"alert_id"`
	RobotID        *string         `json:"robotId" bson:"robot_id"`
	ZoneID         *string         `json:"zoneId" bson:"zone_id"`
	Severity       AlertSeverity   `json:"severity" bson:"severity"`
	Title          string          `json:"title" bson:"title"`
	Message        string          `json:"message" bson:"message"`
	Source         string          `json:"source" bson:"source"`
	Metadata       map[string]interface{} `json:"metadata" bson:"metadata"`
	CreatedAt      time.Time       `json:"createdAt" bson:"created_at"`
	Acknowledged   bool            `json:"acknowledged" bson:"acknowledged"`
	AcknowledgedBy *string         `json:"acknowledgedBy" bson:"acknowledged_by"`
	AcknowledgedAt *time.Time      `json:"acknowledgedAt" bson:"acknowledged_at"`
	Resolved       bool            `json:"resolved" bson:"resolved"`
	ResolvedAt     *time.Time      `json:"resolvedAt" bson:"resolved_at"`
}

type AuditAction string

const (
	AuditActionCreate        AuditAction = "create"
	AuditActionRead          AuditAction = "read"
	AuditActionUpdate        AuditAction = "update"
	AuditActionDelete        AuditAction = "delete"
	AuditActionLogin         AuditAction = "login"
	AuditActionLogout        AuditAction = "logout"
	AuditActionCommand       AuditAction = "command"
	AuditActionConfigChange  AuditAction = "config_change"
)

type AuditEvent struct {
	ID         bson.ObjectId `json:"id" bson:"_id,omitempty"`
	EventID    string       `json:"eventId" bson:"event_id"`
	Timestamp  time.Time    `json:"timestamp" bson:"timestamp"`
	Action     AuditAction  `json:"action" bson:"action"`
	Actor      string       `json:"actor" bson:"actor"`
	TargetType string       `json:"targetType" bson:"target_type"`
	TargetID   string       `json:"targetId" bson:"target_id"`
	Details    map[string]interface{} `json:"details" bson:"details"`
	IPAddress  string       `json:"ipAddress" bson:"ip_address"`
	UserAgent  string       `json:"userAgent" bson:"user_agent"`
}

type OnboardingState string

const (
	OnboardingStateStart      OnboardingState = "start"
	OnboardingStateConnect    OnboardingState = "connect"
	OnboardingStateConfigure  OnboardingState = "configure"
	OnboardingStateVerify     OnboardingState = "verify"
	OnboardingStateComplete   OnboardingState = "complete"
)

type OnboardingSession struct {
	ID           bson.ObjectId   `json:"id" bson:"_id,omitempty"`
	SessionID    string          `json:"sessionId" bson:"session_id"`
	RobotID      string          `json:"robotId" bson:"robot_id"`
	State        OnboardingState `json:"state" bson:"state"`
	CurrentStep  int             `json:"currentStep" bson:"current_step"`
	TotalSteps   int             `json:"totalSteps" bson:"total_steps"`
	StepData     map[string]interface{} `json:"stepData" bson:"step_data"`
	CreatedAt    time.Time       `json:"createdAt" bson:"created_at"`
	UpdatedAt    time.Time       `json:"updatedAt" bson:"updated_at"`
	CompletedAt   *time.Time      `json:"completedAt" bson:"completed_at"`
}

type Telemetry struct {
	RobotID    string     `json:"robotId" bson:"robot_id"`
	Timestamp  time.Time  `json:"timestamp" bson:"timestamp"`
	Position   Position   `json:"position" bson:"position"`
	Orientation Orientation `json:"orientation" bson:"orientation"`
	Velocity   Velocity   `json:"velocity" bson:"velocity"`
	Battery    float64    `json:"battery" bson:"battery"`
	Temperature float64   `json:"temperature" bson:"temperature"`
	Status     string     `json:"status" bson:"status"`
	Metadata   map[string]interface{} `json:"metadata" bson:"metadata"`
}

type Command struct {
	ID          bson.ObjectId `json:"id" bson:"_id,omitempty"`
	CommandID   string       `json:"commandId" bson:"command_id"`
	RobotID     string       `json:"robotId" bson:"robot_id"`
	Command     string       `json:"command" bson:"command"`
	Parameters  map[string]interface{} `json:"parameters" bson:"parameters"`
	Status      string       `json:"status" bson:"status"`
	CreatedAt   time.Time    `json:"createdAt" bson:"created_at"`
	ExecutedAt  *time.Time   `json:"executedAt" bson:"executed_at"`
	CompletedAt *time.Time   `json:"completedAt" bson:"completed_at"`
	Result      string       `json:"result" bson:"result"`
	Error       string       `json:"error" bson:"error"`
}

type FleetStats struct {
	TotalRobots      int     `json:"totalRobots"`
	OnlineRobots     int     `json:"onlineRobots"`
	OfflineRobots    int     `json:"offlineRobots"`
	ErrorRobots      int     `json:"errorRobots"`
	PendingRobots    int     `json:"pendingRobots"`
	TotalZones       int     `json:"totalZones"`
	ActiveAlerts     int     `json:"activeAlerts"`
	CriticalAlerts   int     `json:"criticalAlerts"`
	AvgHealthScore   float64 `json:"avgHealthScore"`
}

type TwinState struct {
	Timestamp time.Time     `json:"timestamp"`
	Robots    []Robot      `json:"robots"`
	Zones     []Zone       `json:"zones"`
}

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Count   int         `json:"count,omitempty"`
}

func NewAPIResponse(success bool, data interface{}, err string) APIResponse {
	return APIResponse{
		Success: success,
		Data:    data,
		Error:   err,
	}
}