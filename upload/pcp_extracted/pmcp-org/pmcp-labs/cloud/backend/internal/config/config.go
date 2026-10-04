package config

import (
	"os"
	"time"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Server   ServerConfig   `yaml:"server"`
	Database DatabaseConfig `yaml:"database"`
	Auth     AuthConfig     `yaml:"auth"`
	Redis    RedisConfig    `yaml:"redis"`
	Metrics  MetricsConfig  `yaml:"metrics"`
	Twin     TwinConfig     `yaml:"twin"`
	Alerts   AlertsConfig   `yaml:"alerts"`
}

type ServerConfig struct {
	Port         int           `yaml:"port"`
	Host         string        `yaml:"host"`
	ReadTimeout  time.Duration `yaml:"read_timeout"`
	WriteTimeout time.Duration `yaml:"write_timeout"`
	IdleTimeout  time.Duration `yaml:"idle_timeout"`
}

type DatabaseConfig struct {
	Type     string `yaml:"type"`
	Path     string `yaml:"path"`
	Host     string `yaml:"host"`
	Port     int    `yaml:"port"`
	User     string `yaml:"user"`
	Password string `yaml:"password"`
	Database string `yaml:"database"`
}

type AuthConfig struct {
	Enabled bool   `yaml:"enabled"`
	JWTKey  string `yaml:"jwt_key"`
}

type RedisConfig struct {
	Enabled  bool   `yaml:"enabled"`
	Host     string `yaml:"host"`
	Port     int    `yaml:"port"`
	Password string `yaml:"password"`
	DB       int    `yaml:"db"`
}

type MetricsConfig struct {
	Enabled        bool          `yaml:"enabled"`
	Interval       time.Duration `yaml:"interval"`
	RetentionDays  int           `yaml:"retention_days"`
	ExportPrometheus bool        `yaml:"export_prometheus"`
}

type TwinConfig struct {
	Enabled       bool   `yaml:"enabled"`
	MaxRobots     int    `yaml:"max_robots"`
	UpdateRateHz  int    `yaml:"update_rate_hz"`
	HistoryLength int    `yaml:"history_length"`
}

type AlertsConfig struct {
	Enabled        bool          `yaml:"enabled"`
	CheckInterval  time.Duration `yaml:"check_interval"`
	MaxAlerts      int           `yaml:"max_alerts"`
	RetentionDays  int           `yaml:"retention_days"`
}

func Default() *Config {
	return &Config{
		Server: ServerConfig{
			Port:         8083,
			Host:         "0.0.0.0",
			ReadTimeout:  15 * time.Second,
			WriteTimeout: 15 * time.Second,
			IdleTimeout:  60 * time.Second,
		},
		Database: DatabaseConfig{
			Type: "sqlite",
			Path: "./data/cloud.db",
		},
		Auth: AuthConfig{
			Enabled: false,
		},
		Redis: RedisConfig{
			Enabled: false,
			Host:    "localhost",
			Port:    6379,
			DB:      0,
		},
		Metrics: MetricsConfig{
			Enabled:         true,
			Interval:        10 * time.Second,
			RetentionDays:   7,
			ExportPrometheus: true,
		},
		Twin: TwinConfig{
			Enabled:       true,
			MaxRobots:     1000,
			UpdateRateHz:  10,
			HistoryLength: 1000,
		},
		Alerts: AlertsConfig{
			Enabled:       true,
			CheckInterval: 5 * time.Second,
			MaxAlerts:     10000,
			RetentionDays: 30,
		},
	}
}

func Load(path string) (*Config, error) {
	if path == "" {
		return Default(), nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}