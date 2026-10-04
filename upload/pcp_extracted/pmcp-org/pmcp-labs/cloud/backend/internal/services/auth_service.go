package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"sync"
	"time"

	"pmcp-cloud/internal/config"
	"pmcp-cloud/internal/models"
)

type AuthService struct {
	cfg         *config.Config
	mu          sync.RWMutex
	users       map[string]*models.User
	sessions    map[string]*models.Session
	apiKeys     map[string]*models.APIKey
	jwtSecret   []byte
	tokenExpiry time.Duration
}

type UserRole string

const (
	RoleAdmin      UserRole = "admin"
	RoleOperator   UserRole = "operator"
	RoleViewer     UserRole = "viewer"
	RoleMaintenance UserRole = "maintenance"
)

func NewAuthService(cfg *config.Config) *AuthService {
	secret := cfg.Auth.JWTSecret
	if secret == "" {
		secret = generateRandomSecret(32)
	}

	svc := &AuthService{
		cfg:         cfg,
		users:       make(map[string]*models.User),
		sessions:    make(map[string]*models.Session),
		apiKeys:     make(map[string]*models.APIKey),
		jwtSecret:   []byte(secret),
		tokenExpiry: 24 * time.Hour,
	}
	svc.initializeDefaultUsers()
	return svc
}

func generateRandomSecret(length int) string {
	b := make([]byte, length)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)[:length]
}

func (s *AuthService) initializeDefaultUsers() {
	defaultUsers := []models.User{
		{
			UserID:       "user-admin",
			Username:     "admin",
			Email:        "admin@pmcp.io",
			PasswordHash: hashPassword("admin123"),
			Role:         string(RoleAdmin),
			Permissions:  []string{"*"},
			CreatedAt:    time.Now(),
			LastLogin:    nil,
			IsActive:     true,
		},
		{
			UserID:       "user-operator",
			Username:     "operator",
			Email:        "operator@pmcp.io",
			PasswordHash: hashPassword("operator123"),
			Role:         string(RoleOperator),
			Permissions:  []string{"robot:read", "robot:command", "alert:read", "alert:write", "task:read", "task:write"},
			CreatedAt:    time.Now(),
			LastLogin:    nil,
			IsActive:     true,
		},
		{
			UserID:       "user-viewer",
			Username:     "viewer",
			Email:        "viewer@pmcp.io",
			PasswordHash: hashPassword("viewer123"),
			Role:         string(RoleViewer),
			Permissions:  []string{"robot:read", "alert:read", "task:read"],
			CreatedAt:    time.Now(),
			LastLogin:    nil,
			IsActive:     true,
		},
	}
	for _, user := range defaultUsers {
		s.users[user.Username] = &user
	}
}

func hashPassword(password string) string {
	hash := sha256.Sum256([]byte(password))
	return base64.StdEncoding.EncodeToString(hash[:])
}

func (s *AuthService) Register(ctx context.Context, username, email, password string, role UserRole) (*models.User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.users[username]; exists {
		return nil, fmt.Errorf("username already exists: %s", username)
	}

	user := &models.User{
		UserID:       fmt.Sprintf("user-%d", time.Now().Unix()),
		Username:     username,
		Email:        email,
		PasswordHash: hashPassword(password),
		Role:         string(role),
		Permissions:  s.getDefaultPermissions(role),
		CreatedAt:    time.Now(),
		IsActive:     true,
	}

	s.users[username] = user
	return user, nil
}

func (s *AuthService) getDefaultPermissions(role UserRole) []string {
	switch role {
	case RoleAdmin:
		return []string{"*"}
	case RoleOperator:
		return []string{"robot:read", "robot:command", "alert:read", "alert:write", "task:read", "task:write", "zone:read", "zone:write"}
	case RoleMaintenance:
		return []string{"robot:read", "robot:command", "alert:read", "task:read"}
	case RoleViewer:
		return []string{"robot:read", "alert:read", "task:read"}
	default:
		return []string{}
	}
}

func (s *AuthService) Login(ctx context.Context, username, password string) (*models.Session, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	user, ok := s.users[username]
	if !ok {
		return nil, fmt.Errorf("invalid credentials")
	}

	if !user.IsActive {
		return nil, fmt.Errorf("user account is disabled")
	}

	if user.PasswordHash != hashPassword(password) {
		return nil, fmt.Errorf("invalid credentials")
	}

	session := &models.Session{
		SessionID:   generateRandomSecret(32),
		UserID:      user.UserID,
		Username:    username,
		Token:       generateRandomSecret(48),
		ExpiresAt:   time.Now().Add(s.tokenExpiry),
		CreatedAt:   time.Now(),
		LastActivity: time.Now(),
		IPAddress:   "",
		UserAgent:   "",
	}

	user.LastLogin = new(time.Time)
	*user.LastLogin = time.Now()

	s.sessions[session.SessionID] = session
	return session, nil
}

func (s *AuthService) Logout(ctx context.Context, sessionID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.sessions[sessionID]; !ok {
		return fmt.Errorf("session not found")
	}

	delete(s.sessions, sessionID)
	return nil
}

func (s *AuthService) ValidateSession(ctx context.Context, sessionID string) (*models.Session, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	session, ok := s.sessions[sessionID]
	if !ok {
		return nil, fmt.Errorf("session not found")
	}

	if time.Now().After(session.ExpiresAt) {
		delete(s.sessions, sessionID)
		return nil, fmt.Errorf("session expired")
	}

	session.LastActivity = time.Now()
	return session, nil
}

func (s *AuthService) GetUser(ctx context.Context, userID string) (*models.User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, user := range s.users {
		if user.UserID == userID {
			return user, nil
		}
	}
	return nil, fmt.Errorf("user not found: %s", userID)
}

func (s *AuthService) GetUserByUsername(ctx context.Context, username string) (*models.User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	user, ok := s.users[username]
	if !ok {
		return nil, fmt.Errorf("user not found: %s", username)
	}
	return user, nil
}

func (s *AuthService) UpdateUser(ctx context.Context, user *models.User) (*models.User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.users[user.Username]; !ok {
		return nil, fmt.Errorf("user not found: %s", user.Username)
	}

	s.users[user.Username] = user
	return user, nil
}

func (s *AuthService) DeleteUser(ctx context.Context, username string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.users[username]; !ok {
		return fmt.Errorf("user not found: %s", username)
	}

	delete(s.users, username)
	return nil
}

func (s *AuthService) ListUsers(ctx context.Context) ([]*models.User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	users := make([]*models.User, 0, len(s.users))
	for _, user := range s.users {
		users = append(users, user)
	}
	return users, nil
}

func (s *AuthService) CreateAPIKey(ctx context.Context, userID string, name string, permissions []string) (*models.APIKey, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	apiKey := &models.APIKey{
		KeyID:     generateRandomSecret(16),
		Secret:    generateRandomSecret(32),
		UserID:    userID,
		Name:      name,
		Permissions: permissions,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(365 * 24 * time.Hour),
		IsActive:  true,
	}

	s.apiKeys[apiKey.KeyID] = apiKey
	return apiKey, nil
}

func (s *AuthService) ValidateAPIKey(ctx context.Context, keyID, secret string) (*models.APIKey, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	apiKey, ok := s.apiKeys[keyID]
	if !ok {
		return nil, fmt.Errorf("invalid API key")
	}

	if !apiKey.IsActive {
		return nil, fmt.Errorf("API key is disabled")
	}

	if time.Now().After(apiKey.ExpiresAt) {
		return nil, fmt.Errorf("API key has expired")
	}

	if apiKey.Secret != secret {
		return nil, fmt.Errorf("invalid API key")
	}

	return apiKey, nil
}

func (s *AuthService) RevokeAPIKey(ctx context.Context, keyID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	apiKey, ok := s.apiKeys[keyID]
	if !ok {
		return fmt.Errorf("API key not found")
	}

	apiKey.IsActive = false
	return nil
}

func (s *AuthService) HasPermission(ctx context.Context, user *models.User, permission string) bool {
	for _, p := range user.Permissions {
		if p == "*" {
			return true
		}
		if p == permission {
			return true
		}
		if p == permission+":*" {
			return true
		}
	}
	return false
}

func (s *AuthService) ChangePassword(ctx context.Context, username, oldPassword, newPassword string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	user, ok := s.users[username]
	if !ok {
		return fmt.Errorf("user not found")
	}

	if user.PasswordHash != hashPassword(oldPassword) {
		return fmt.Errorf("current password is incorrect")
	}

	user.PasswordHash = hashPassword(newPassword)
	return nil
}

func (s *AuthService) ResetPassword(ctx context.Context, userID, newPassword string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, user := range s.users {
		if user.UserID == userID {
			user.PasswordHash = hashPassword(newPassword)
			return nil
		}
	}
	return fmt.Errorf("user not found")
}