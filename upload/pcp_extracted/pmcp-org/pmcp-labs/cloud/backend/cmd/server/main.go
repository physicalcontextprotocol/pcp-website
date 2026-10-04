package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"pmcp-cloud/internal/config"
	"pmcp-cloud/internal/handlers"
	"pmcp-cloud/internal/middleware"
	"pmcp-cloud/internal/services"
	"pmcp-cloud/internal/websocket"

	"github.com/gorilla/mux"
	"github.com/gorilla/handlers"
)

func main() {
	configPath := flag.String("config", "config.yaml", "Path to configuration file")
	port := flag.Int("port", 8083, "Port to listen on")
	host := flag.String("host", "0.0.0.0", "Host to bind to")
	logLevel := flag.String("log-level", "info", "Logging level")
	flag.Parse()

	logger := log.New(os.Stdout, "[pmcp-cloud] ", log.LstdFlags)
	logger.SetLevel(*logLevel)

	cfg, err := config.Load(*configPath)
	if err != nil {
		logger.Printf("Warning: could not load config file: %v, using defaults", err)
		cfg = config.Default()
	}

	logger.Printf("Starting P-MCP Cloud Control Plane on %s:%d", *host, *port)

	robotService := services.NewRobotService(cfg)
	zoneService := services.NewZoneService(cfg)
	alertService := services.NewAlertService(cfg)
	auditService := services.NewAuditService(cfg)
	onboardingService := services.NewOnboardingService(cfg)
	twinService := services.NewTwinService(cfg)
	metricsService := services.NewMetricsService(cfg)

	hub := websocket.NewHub()
	go hub.Run()

	router := mux.NewRouter()
	router.Use(middleware.Logger(logger))
	router.Use(middleware.Recoverer)
	router.Use(middleware.CORS)

	router.Methods("GET").Path("/health").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlers.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"status":  "healthy",
			"version": "0.5.0",
			"time":    time.Now().Unix(),
		})
	})

	api := router.PathPrefix("/api/v1").Subrouter()
	api.Use(middleware.Auth(cfg.Auth.Enabled))

	handlers.NewRobotHandler(robotService).Register(api)
	handlers.NewZoneHandler(zoneService).Register(api)
	handlers.NewAlertHandler(alertService).Register(api)
	handlers.NewAuditHandler(auditService).Register(api)
	handlers.NewOnboardingHandler(onboardingService).Register(api)
	handlers.NewTwinHandler(twinService, hub).Register(api)
	handlers.NewMetricsHandler(metricsService).Register(api)
	handlers.NewFleetHandler(robotService, alertService, metricsService).Register(api)

	router.Methods("GET").Path("/ws/twin").Handler(websocket.HandleHub(hub))

	corsOpts := handlers.AllowedOrigins([]string{"*"})
	corsMethods := handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"})
	corsHeaders := handlers.AllowedHeaders([]string{"Content-Type", "Authorization", "X-User"})

	server := &http.Server{
		Addr:         fmt.Sprintf("%s:%d", *host, *port),
		Handler:      handlers.CORS(corsOpts, corsMethods, corsHeaders)(router),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		logger.Printf("Server listening on %s:%d", *host, *port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatalf("Server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Fatalf("Server forced to shutdown: %v", err)
	}

	logger.Println("Server exited")
}