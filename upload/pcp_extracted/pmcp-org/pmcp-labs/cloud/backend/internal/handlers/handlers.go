package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"time"

	"pmcp-cloud/internal/models"
	"pmcp-cloud/internal/services"

	"github.com/gorilla/mux"
)

type RobotHandler struct {
	service *services.RobotService
}

func NewRobotHandler(svc *services.RobotService) *RobotHandler {
	return &RobotHandler{service: svc}
}

func (h *RobotHandler) Register(r *mux.Router) {
	r.Methods("GET").Path("/robots").HandlerFunc(h.List)
	r.Methods("POST").Path("/robots").HandlerFunc(h.Create)
	r.Methods("GET").Path("/robots/{id}").HandlerFunc(h.Get)
	r.Methods("PUT").Path("/robots/{id}").HandlerFunc(h.Update)
	r.Methods("DELETE").Path("/robots/{id}").HandlerFunc(h.Delete)
	r.Methods("POST").Path("/robots/{id}/telemetry").HandlerFunc(h.Telemetry)
	r.Methods("POST").Path("/robots/{id}/command").HandlerFunc(h.Command)
	r.Methods("POST").Path("/robots/{id}/assign-zone").HandlerFunc(h.AssignZone)
}

func (h *RobotHandler) List(w http.ResponseWriter, r *http.Request) {
	statusStr := r.URL.Query().Get("status")
	var status *models.RobotStatus
	if statusStr != "" {
		s := models.RobotStatus(statusStr)
		status = &s
	}
	zone := r.URL.Query().Get("zone")

	ctx := r.Context()
	robots, err := h.service.List(ctx, status, zone)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, robots, ""))
}

func (h *RobotHandler) Create(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, models.NewAPIResponse(false, nil, "Invalid request body"))
		return
	}

	var robot models.Robot
	if err := json.Unmarshal(body, &robot); err != nil {
		WriteJSON(w, http.StatusBadRequest, models.NewAPIResponse(false, nil, "Invalid JSON"))
		return
	}

	ctx := r.Context()
	created, err := h.service.Register(ctx, &robot)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusCreated, models.NewAPIResponse(true, created, ""))
}

func (h *RobotHandler) Get(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	robotID := vars["id"]

	ctx := r.Context()
	robot, err := h.service.Get(ctx, robotID)
	if err != nil {
		WriteJSON(w, http.StatusNotFound, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, robot, ""))
}

func (h *RobotHandler) Update(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	robotID := vars["id"]

	body, err := io.ReadAll(r.Body)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, models.NewAPIResponse(false, nil, "Invalid request body"))
		return
	}

	var robot models.Robot
	if err := json.Unmarshal(body, &robot); err != nil {
		WriteJSON(w, http.StatusBadRequest, models.NewAPIResponse(false, nil, "Invalid JSON"))
		return
	}

	robot.RobotID = robotID
	ctx := r.Context()
	updated, err := h.service.Update(ctx, &robot)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, updated, ""))
}

func (h *RobotHandler) Delete(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	robotID := vars["id"]

	ctx := r.Context()
	if err := h.service.Delete(ctx, robotID); err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, map[string]string{"deleted": "true"}, ""))
}

func (h *RobotHandler) Telemetry(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	robotID := vars["id"]

	body, err := io.ReadAll(r.Body)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, models.NewAPIResponse(false, nil, "Invalid request body"))
		return
	}

	var telemetry models.Telemetry
	if err := json.Unmarshal(body, &telemetry); err != nil {
		WriteJSON(w, http.StatusBadRequest, models.NewAPIResponse(false, nil, "Invalid JSON"))
		return
	}

	telemetry.RobotID = robotID
	telemetry.Timestamp = time.Now()

	ctx := r.Context()
	if err := h.service.UpdateTelemetry(ctx, robotID, &telemetry); err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, map[string]bool{"received": true}, ""))
}

func (h *RobotHandler) Command(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	robotID := vars["id"]

	body, err := io.ReadAll(r.Body)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, models.NewAPIResponse(false, nil, "Invalid request body"))
		return
	}

	var cmd struct {
		Command   string                 `json:"command"`
		Parameters map[string]interface{} `json:"parameters"`
	}
	if err := json.Unmarshal(body, &cmd); err != nil {
		WriteJSON(w, http.StatusBadRequest, models.NewAPIResponse(false, nil, "Invalid JSON"))
		return
	}

	ctx := r.Context()
	commandID, err := h.service.ExecuteCommand(ctx, robotID, cmd.Command, cmd.Parameters)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, map[string]string{
		"commandId": commandID,
		"status":    "queued",
	}, ""))
}

func (h *RobotHandler) AssignZone(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	robotID := vars["id"]

	body, err := io.ReadAll(r.Body)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, models.NewAPIResponse(false, nil, "Invalid request body"))
		return
	}

	var req struct {
		ZoneID string `json:"zoneId"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, models.NewAPIResponse(false, nil, "Invalid JSON"))
		return
	}

	ctx := r.Context()
	if err := h.service.AssignZone(ctx, robotID, req.ZoneID); err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, map[string]string{"assigned": req.ZoneID}, ""))
}

type AlertHandler struct {
	service *services.AlertService
}

func NewAlertHandler(svc *services.AlertService) *AlertHandler {
	return &AlertHandler{service: svc}
}

func (h *AlertHandler) Register(r *mux.Router) {
	r.Methods("GET").Path("/alerts").HandlerFunc(h.List)
	r.Methods("POST").Path("/alerts").HandlerFunc(h.Create)
	r.Methods("POST").Path("/alerts/{id}/acknowledge").HandlerFunc(h.Acknowledge)
	r.Methods("POST").Path("/alerts/{id}/resolve").HandlerFunc(h.Resolve)
	r.Methods("GET").Path("/alerts/stats").HandlerFunc(h.Stats)
}

func (h *AlertHandler) List(w http.ResponseWriter, r *http.Request) {
	robotID := r.URL.Query().Get("robotId")
	severity := r.URL.Query().Get("severity")
	resolved := r.URL.Query().Get("resolved")

	var robotIDPtr *string
	if robotID != "" {
		robotIDPtr = &robotID
	}
	var severityPtr *models.AlertSeverity
	if severity != "" {
		s := models.AlertSeverity(severity)
		severityPtr = &s
	}
	var resolvedPtr *bool
	if resolved != "" {
		r := resolved == "true"
		resolvedPtr = &r
	}

	ctx := r.Context()
	alerts, err := h.service.List(ctx, robotIDPtr, severityPtr, nil, resolvedPtr)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, alerts, ""))
}

func (h *AlertHandler) Create(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, models.NewAPIResponse(false, nil, "Invalid request body"))
		return
	}

	var alert models.Alert
	if err := json.Unmarshal(body, &alert); err != nil {
		WriteJSON(w, http.StatusBadRequest, models.NewAPIResponse(false, nil, "Invalid JSON"))
		return
	}

	ctx := r.Context()
	created, err := h.service.Create(ctx, &alert)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusCreated, models.NewAPIResponse(true, created, ""))
}

func (h *AlertHandler) Acknowledge(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	alertID := vars["id"]

	actor := r.Header.Get("X-User")
	if actor == "" {
		actor = "system"
	}

	ctx := r.Context()
	updated, err := h.service.Acknowledge(ctx, alertID, actor)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, updated, ""))
}

func (h *AlertHandler) Resolve(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	alertID := vars["id"]

	ctx := r.Context()
	updated, err := h.service.Resolve(ctx, alertID)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, updated, ""))
}

func (h *AlertHandler) Stats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	stats, err := h.service.GetStats(ctx)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, models.NewAPIResponse(false, nil, err.Error()))
		return
	}

	WriteJSON(w, http.StatusOK, models.NewAPIResponse(true, stats, ""))
}

func WriteJSON(w http.ResponseWriter, status int, response models.APIResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(response)
}