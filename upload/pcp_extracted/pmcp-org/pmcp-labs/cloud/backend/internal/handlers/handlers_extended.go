package handlers

import (
	"encoding/json"
	"io"
	"net/http"

	"pmcp-cloud/internal/models"
	"pmcp-cloud/internal/services"
	"pmcp-cloud/internal/websocket"

	"github.com/gorilla/mux"
)

type ZoneHandler struct {
	service *services.ZoneService
}

func NewZoneHandler(svc *services.ZoneService) *ZoneHandler {
	return &ZoneHandler{service: svc}
}

func (h *ZoneHandler) Register(r *mux.Router) {
	r.Methods("GET").Path("/zones").HandlerFunc(h.List)
	r.Methods("POST").Path("/zones").HandlerFunc(h.Create)
	r.Methods("GET").Path("/zones/{id}").HandlerFunc(h.Get)
	r.Methods("PUT").Path("/zones/{id}").HandlerFunc(h.Update)
	r.Methods("DELETE").Path("/zones/{id}").HandlerFunc(h.Delete)
	r.Methods("POST").Path("/zones/{id}/robots").HandlerFunc(h.AddRobot)
	r.Methods("DELETE").Path("/zones/{id}/robots/{robotId}").HandlerFunc(h.RemoveRobot)
}

func (h *ZoneHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	zones, err := h.service.List(ctx)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}
	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, zones, ""))
}

func (h *ZoneHandler) Create(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, models.NewAPIResponse(false, nil, "Invalid request body"))
		return
	}

	var zone models.Zone
	if err := json.Unmarshal(body, &zone); err != nil {
		WriteJSON(w, http.StatusBadRequest, models.NewAPIResponse(false, nil, "Invalid JSON"))
		return
	}

	ctx := r.Context()
	created, err := h.service.Create(ctx, &zone)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusCreated, models.NewAPIResponse(true, created, ""))
}

func (h *ZoneHandler) Get(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	zoneID := vars["id"]

	ctx := r.Context()
	zone, err := h.service.Get(ctx, zoneID)
	if err != nil {
		WriteJSON(w, http.StatusNotFound, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, zone, ""))
}

func (h *ZoneHandler) Update(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	zoneID := vars["id"]

	body, err := io.ReadAll(r.Body)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, models.NewAPIResponse(false, nil, "Invalid request body"))
		return
	}

	var zone models.Zone
	if err := json.Unmarshal(body, &zone); err != nil {
		WriteJSON(w, http.StatusBadRequest, models.NewAPIResponse(false, nil, "Invalid JSON"))
		return
	}

	zone.ZoneID = zoneID
	ctx := r.Context()
	updated, err := h.service.Update(ctx, &zone)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, updated, ""))
}

func (h *ZoneHandler) Delete(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	zoneID := vars["id"]

	ctx := r.Context()
	if err := h.service.Delete(ctx, zoneID); err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, map[string]bool{"deleted": true}, ""))
}

func (h *ZoneHandler) AddRobot(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	zoneID := vars["id"]

	body, err := io.ReadAll(r.Body)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, models.NewAPIResponse(false, nil, "Invalid request body"))
		return
	}

	var req struct {
		RobotID string `json:"robotId"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, models.NewAPIResponse(false, nil, "Invalid JSON"))
		return
	}

	ctx := r.Context()
	if err := h.service.AddRobot(ctx, zoneID, req.RobotID); err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, map[string]string{"added": req.RobotID}, ""))
}

func (h *ZoneHandler) RemoveRobot(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	zoneID := vars["id"]
	robotID := vars["robotId"]

	ctx := r.Context()
	if err := h.service.RemoveRobot(ctx, zoneID, robotID); err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, map[string]string{"removed": robotID}, ""))
}

type AuditHandler struct {
	service *services.AuditService
}

func NewAuditHandler(svc *services.AuditService) *AuditHandler {
	return &AuditHandler{service: svc}
}

func (h *AuditHandler) Register(r *mux.Router) {
	r.Methods("GET").Path("/audit").HandlerFunc(h.List)
	r.Methods("POST").Path("/audit/query").HandlerFunc(h.Query)
	r.Methods("GET").Path("/audit/compliance").HandlerFunc(h.Compliance)
}

func (h *AuditHandler) List(w http.ResponseWriter, r *http.Request) {
	limit := 100
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := parseInt(l); err == nil {
			limit = parsed
		}
	}

	ctx := r.Context()
	events, err := h.service.Query(ctx, nil, "", "", nil, nil, limit)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, events, ""))
}

func (h *AuditHandler) Query(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, models.NewAPIResponse(false, nil, "Invalid request body"))
		return
	}

	var req struct {
		Action     string `json:"action"`
		Actor      string `json:"actor"`
		TargetType string `json:"targetType"`
		Limit      int    `json:"limit"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, models.NewAPIResponse(false, nil, "Invalid JSON"))
		return
	}

	var actionPtr *models.AuditAction
	if req.Action != "" {
		a := models.AuditAction(req.Action)
		actionPtr = &a
	}

	ctx := r.Context()
	events, err := h.service.Query(ctx, actionPtr, req.Actor, req.TargetType, nil, nil, req.Limit)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, events, ""))
}

func (h *AuditHandler) Compliance(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	report, err := h.service.GetComplianceReport(ctx, time.Now().Add(-24*time.Hour), time.Now())
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, report, ""))
}

type TwinHandler struct {
	service *services.TwinService
	hub     *websocket.Hub
}

func NewTwinHandler(svc *services.TwinService, hub *websocket.Hub) *TwinHandler {
	if hub != nil {
		svc.SetHub(hub)
	}
	return &TwinHandler{service: svc, hub: hub}
}

func (h *TwinHandler) Register(r *mux.Router) {
	r.Methods("GET").Path("/twin").HandlerFunc(h.GetState)
	r.Methods("GET").Path("/twin/positions").HandlerFunc(h.GetPositions)
	r.Methods("GET").Path("/twin/positions/{id}").HandlerFunc(h.GetPosition)
	r.Methods("GET").Path("/twin/history/{id}").HandlerFunc(h.GetHistory)
	r.Methods("GET").Path("/twin/collisions").HandlerFunc(h.Collisions)
	r.Methods("GET").Path("/twin/proximity/{id}").HandlerFunc(h.Proximity)
	r.Methods("GET").Path("/twin/views").HandlerFunc(h.ListViews)
	r.Methods("GET").Path("/twin/views/{id}").HandlerFunc(h.GetView)
	r.Methods("POST").Path("/twin/views").HandlerFunc(h.CreateView)
	r.Methods("GET").Path("/twin/heatmap").HandlerFunc(h.Heatmap)
	r.Methods("GET").Path("/twin/trajectory/{id}").HandlerFunc(h.Trajectory)
	r.Methods("GET").Path("/twin/analytics/{id}").HandlerFunc(h.Analytics)
}

func (h *TwinHandler) GetState(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	state, err := h.service.GetState(ctx)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, state, ""))
}

func (h *TwinHandler) GetPositions(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	positions, err := h.service.GetAllPositions(ctx)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, positions, ""))
}

func (h *TwinHandler) GetPosition(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	robotID := vars["id"]

	ctx := r.Context()
	position, err := h.service.GetPosition(ctx, robotID)
	if err != nil {
		WriteJSON(w, http.StatusNotFound, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, position, ""))
}

func (h *TwinHandler) GetHistory(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	robotID := vars["id"]

	limit := 100
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := parseInt(l); err == nil {
			limit = parsed
		}
	}

	ctx := r.Context()
	history, err := h.service.GetHistory(ctx, robotID, limit)
	if err != nil {
		WriteJSON(w, http.StatusNotFound, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, history, ""))
}

func (h *TwinHandler) Collisions(w http.ResponseWriter, r *http.Request) {
	threshold := 0.5
	if t := r.URL.Query().Get("threshold"); t != "" {
		if parsed, err := parseFloat(t); err == nil {
			threshold = parsed
		}
	}

	ctx := r.Context()
	collisions, err := h.service.DetectCollisions(ctx, threshold)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, collisions, ""))
}

func (h *TwinHandler) Proximity(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	robotID := vars["id"]

	radius := 2.0
	if t := r.URL.Query().Get("radius"); t != "" {
		if parsed, err := parseFloat(t); err == nil {
			radius = parsed
		}
	}

	ctx := r.Context()
	events, err := h.service.DetectProximity(ctx, robotID, radius)
	if err != nil {
		WriteJSON(w, http.StatusNotFound, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, events, ""))
}

func (h *TwinHandler) ListViews(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	views, err := h.service.ListViews(ctx)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, views, ""))
}

func (h *TwinHandler) GetView(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	viewID := vars["id"]

	ctx := r.Context()
	view, err := h.service.GetView(ctx, viewID)
	if err != nil {
		WriteJSON(w, http.StatusNotFound, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, view, ""))
}

func (h *TwinHandler) CreateView(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, models.NewAPIResponse(false, nil, "Invalid request body"))
		return
	}

	var view services.TwinView
	if err := json.Unmarshal(body, &view); err != nil {
		WriteJSON(w, http.StatusBadRequest, models.NewAPIResponse(false, nil, "Invalid JSON"))
		return
	}

	ctx := r.Context()
	created, err := h.service.CreateView(ctx, &view)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusCreated, models.NewAPIResponse(true, created, ""))
}

func (h *TwinHandler) Heatmap(w http.ResponseWriter, r *http.Request) {
	zoneID := r.URL.Query().Get("zone")
	hours := 24
	if h := r.URL.Query().Get("hours"); h != "" {
		if parsed, err := parseInt(h); err == nil {
			hours = parsed
		}
	}

	ctx := r.Context()
	heatmap, err := h.service.GetHeatmap(ctx, zoneID, time.Duration(hours)*time.Hour)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, heatmap, ""))
}

func (h *TwinHandler) Trajectory(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	robotID := vars["id"]

	hours := 1
	if h := r.URL.Query().Get("hours"); h != "" {
		if parsed, err := parseInt(h); err == nil {
			hours = parsed
		}
	}

	ctx := r.Context()
	trajectory, err := h.service.GetTrajectory(ctx, robotID, time.Duration(hours)*time.Hour)
	if err != nil {
		WriteJSON(w, http.StatusNotFound, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, trajectory, ""))
}

func (h *TwinHandler) Analytics(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	robotID := vars["id"]

	ctx := r.Context()
	analytics, err := h.service.GetAnalytics(ctx, robotID)
	if err != nil {
		WriteJSON(w, http.StatusNotFound, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, analytics, ""))
}

type OnboardingHandler struct {
	service *services.OnboardingService
}

func NewOnboardingHandler(svc *services.OnboardingService) *OnboardingHandler {
	return &OnboardingHandler{service: svc}
}

func (h *OnboardingHandler) Register(r *mux.Router) {
	r.Methods("GET").Path("/onboarding").HandlerFunc(h.List)
	r.Methods("POST").Path("/onboarding/start").HandlerFunc(h.Start)
	r.Methods("POST").Path("/onboarding/{id}/next").HandlerFunc(h.Next)
	r.Methods("POST").Path("/onboarding/{id}/complete").HandlerFunc(h.Complete)
	r.Methods("POST").Path("/onboarding/{id}/cancel").HandlerFunc(h.Cancel)
	r.Methods("GET").Path("/onboarding/steps").HandlerFunc(h.Steps)
}

func (h *OnboardingHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	sessions, err := h.service.List(ctx)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, sessions, ""))
}

func (h *OnboardingHandler) Start(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, models.NewAPIResponse(false, nil, "Invalid request body"))
		return
	}

	var req struct {
		RobotID string `json:"robotId"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, models.NewAPIResponse(false, nil, "Invalid JSON"))
		return
	}

	ctx := r.Context()
	session, err := h.service.StartSession(ctx, req.RobotID)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusCreated, models.NewAPIResponse(true, session, ""))
}

func (h *OnboardingHandler) Next(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sessionID := vars["id"]

	body, err := io.ReadAll(r.Body)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, models.NewAPIResponse(false, nil, "Invalid request body"))
		return
	}

	var data map[string]interface{}
	if err := json.Unmarshal(body, &data); err != nil {
		data = make(map[string]interface{})
	}

	ctx := r.Context()
	session, err := h.service.NextStep(ctx, sessionID, data)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, session, ""))
}

func (h *OnboardingHandler) Complete(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sessionID := vars["id"]

	ctx := r.Context()
	session, err := h.service.Complete(ctx, sessionID)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, session, ""))
}

func (h *OnboardingHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sessionID := vars["id"]

	ctx := r.Context()
	if err := h.service.Cancel(ctx, sessionID); err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, map[string]bool{"cancelled": true}, ""))
}

func (h *OnboardingHandler) Steps(w http.ResponseWriter, r *http.Request) {
	steps := h.service.GetSteps()
	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, steps, ""))
}

type FleetHandler struct {
	robotService  *services.RobotService
	alertService *services.AlertService
	metricsService *services.MetricsService
}

func NewFleetHandler(rs *services.RobotService, as *services.AlertService, ms *services.MetricsService) *FleetHandler {
	return &FleetHandler{
		robotService:   rs,
		alertService:   as,
		metricsService: ms,
	}
}

func (h *FleetHandler) Register(r *mux.Router) {
	r.Methods("GET").Path("/fleet/stats").HandlerFunc(h.Stats)
	r.Methods("GET").Path("/fleet/health").HandlerFunc(h.Health)
	r.Methods("GET").Path("/fleet/alerts").HandlerFunc(h.AlertsSummary)
}

func (h *FleetHandler) Stats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	stats, err := h.robotService.GetStats(ctx)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, stats, ""))
}

func (h *FleetHandler) Health(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	stats, err := h.robotService.GetStats(ctx)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	health := map[string]interface{}{
		"overallScore":  stats.AvgHealthScore,
		"totalRobots":   stats.TotalRobots,
		"healthyRobots": stats.OnlineRobots,
		"unhealthy":     stats.ErrorRobots + stats.OfflineRobots,
		"alerts":        stats.ActiveAlerts,
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, health, ""))
}

func (h *FleetHandler) AlertsSummary(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	stats, err := h.alertService.GetStats(ctx)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, stats, ""))
}

type MetricsHandler struct {
	service *services.MetricsService
}

func NewMetricsHandler(svc *services.MetricsService) *MetricsHandler {
	return &MetricsHandler{service: svc}
}

func (h *MetricsHandler) Register(r *mux.Router) {
	r.Methods("GET").Path("/metrics").HandlerFunc(h.Get)
	r.Methods("GET").Path("/metrics/export").HandlerFunc(h.Export)
}

func (h *MetricsHandler) Get(w http.ResponseWriter, r *http.Request) {
	metrics := h.service.GetAllMetrics()
	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, metrics, ""))
}

func (h *MetricsHandler) Export(w http.ResponseWriter, r *http.Request) {
	format := r.URL.Query().Get("format")
	if format == "" {
		format = "json"
	}

	metrics := h.service.GetAllMetrics()

	if format == "prometheus" {
		prometheus := h.service.GetPrometheusMetrics()
		w.Header().Set("Content-Type", "text/plain")
		w.Write([]byte(prometheus))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, metrics, ""))
}

func parseInt(s string) (int, error) {
	return strconv.Atoi(s)
}

func parseFloat(s string) (float64, error) {
	return strconv.ParseFloat(s, 64)
}

func init() {
	time.Now()
}