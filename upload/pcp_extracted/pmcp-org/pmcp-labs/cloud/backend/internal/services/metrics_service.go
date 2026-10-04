package services

import (
	"context"
	"sync"
	"time"

	"pmcp-cloud/internal/config"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

type MetricsService struct {
	cfg       *config.Config
	mu        sync.RWMutex
	metrics   map[string]*MetricValue
	counters  map[string]*Counter
	gauges    map[string]*Gauge
	histograms map[string]*Histogram
}

type MetricValue struct {
	Name      string    `json:"name"`
	Value     float64   `json:"value"`
	Labels    map[string]string `json:"labels"`
	Timestamp time.Time `json:"timestamp"`
}

type Counter struct {
	name   string
	labels map[string]string
	value  float64
}

type Gauge struct {
	name   string
	labels map[string]string
	value  float64
}

type Histogram struct {
	name   string
	labels map[string]string
	buckets map[float64]uint64
	count  uint64
	sum    float64
}

var (
	robotCountMetric = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: "pmcp_robots_total",
		Help: "Total number of robots",
	}, []string{"status", "zone"})

	alertCountMetric = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "pmcp_alerts_total",
		Help: "Total number of alerts",
	}, []string{"severity"})

	requestDurationMetric = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "pmcp_request_duration_seconds",
		Help:    "Request duration in seconds",
		Buckets: []float64{0.001, 0.01, 0.1, 0.5, 1, 5},
	}, []string{"endpoint"})

	telemetryMessagesMetric = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "pmcp_telemetry_messages_total",
		Help: "Total telemetry messages",
	}, []string{"robot_id"})
)

func NewMetricsService(cfg *config.Config) *MetricsService {
	svc := &MetricsService{
		cfg:         cfg,
		metrics:     make(map[string]*MetricValue),
		counters:    make(map[string]*Counter),
		gauges:      make(map[string]*Gauge),
		histograms:  make(map[string]*Histogram),
	}
	return svc
}

func (s *MetricsService) RecordCounter(name string, value float64, labels map[string]string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	key := name + "_" + labelsToString(labels)
	s.counters[key] = &Counter{name, labels, value}
}

func (s *MetricsService) RecordGauge(name string, value float64, labels map[string]string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	key := name + "_" + labelsToString(labels)
	s.gauges[key] = &Gauge{name, labels, value}

	robotCountMetric.With(prometheus.Labels(labels)).Set(value)
}

func (s *MetricsService) RecordHistogram(name string, value float64, labels map[string]string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	key := name + "_" + labelsToString(labels)
	if _, ok := s.histograms[key]; !ok {
		s.histograms[key] = &Histogram{name, labels, make(map[float64]uint64), 0, 0}
	}

	hist := s.histograms[key]
	hist.count++
	hist.sum += value

	for bucket := range hist.buckets {
		if value <= bucket {
			hist.buckets[bucket]++
		}
	}

	requestDurationMetric.With(prometheus.Labels(labels)).Observe(value)
}

func (s *MetricsService) IncrementCounter(name string, labels map[string]string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	key := name + "_" + labelsToString(labels)
	if c, ok := s.counters[key]; ok {
		c.value++
	} else {
		s.counters[key] = &Counter{name, labels, 1}
	}

	alertCountMetric.With(prometheus.Labels(labels)).Inc()
}

func (s *MetricsService) SetGauge(name string, value float64, labels map[string]string) {
	s.RecordGauge(name, value, labels)
}

func (s *MetricsService) GetCounter(name string, labels map[string]string) float64 {
	s.mu.RLock()
	defer s.mu.RUnlock()

	key := name + "_" + labelsToString(labels)
	if c, ok := s.counters[key]; ok {
		return c.value
	}
	return 0
}

func (s *MetricsService) GetGauge(name string, labels map[string]string) float64 {
	s.mu.RLock()
	defer s.mu.RUnlock()

	key := name + "_" + labelsToString(labels)
	if g, ok := s.gauges[key]; ok {
		return g.value
	}
	return 0
}

func (s *MetricsService) GetAllMetrics() map[string]interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make(map[string]interface{})

	counters := make([]map[string]interface{}, 0)
	for _, c := range s.counters {
		counters = append(counters, map[string]interface{}{
			"name":   c.name,
			"value":  c.value,
			"labels": c.labels,
		})
	}
	result["counters"] = counters

	gauges := make([]map[string]interface{}, 0)
	for _, g := range s.gauges {
		gauges = append(gauges, map[string]interface{}{
			"name":   g.name,
			"value":  g.value,
			"labels": g.labels,
		})
	}
	result["gauges"] = gauges

	return result
}

func (s *MetricsService) RecordTelemetry(robotID string) {
	telemetryMessagesMetric.With(prometheus.Labels{"robot_id": robotID}).Inc()
}

func (s *MetricsService) RecordRequest(endpoint string, duration float64) {
	s.RecordHistogram("request_duration", duration, map[string]string{"endpoint": endpoint})
}

func labelsToString(labels map[string]string) string {
	result := ""
	for k, v := range labels {
		result += k + "=" + v + ","
	}
	return result
}

func (s *MetricsService) GetPrometheusMetrics() string {
	return ""
}

type PrometheusExporter struct {
	metricsService *MetricsService
}

func NewPrometheusExporter(ms *MetricsService) *PrometheusExporter {
	return &PrometheusExporter{metricsService: ms}
}

func (p *PrometheusExporter) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte(p.metricsService.GetPrometheusMetrics()))
}

type MetricsCollector struct {
	service *MetricsService
}

func NewMetricsCollector(svc *MetricsService) *MetricsCollector {
	return &MetricsCollector{service: svc}
}

func (m *MetricsCollector) Start(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			m.collect()
		}
	}
}

func (m *MetricsCollector) collect() {
}

func (m *MetricsCollector) RecordRobotMetrics(robotID, status, zone string) {
	m.service.RecordGauge("robot_status", 1, map[string]string{
		"robot_id": robotID,
		"status":   status,
		"zone":     zone,
	})
}

func (m *MetricsCollector) RecordAlertMetrics(severity string) {
	m.service.IncrementCounter("alerts", map[string]string{"severity": severity})
}