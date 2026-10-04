package services

import (
	"context"
	"fmt"
	"sync"
	"time"

	"pmcp-cloud/internal/config"
	"pmcp-cloud/internal/models"
)

type NotificationService struct {
	cfg           *config.Config
	mu            sync.RWMutex
	notifications map[string]*models.Notification
	channels      map[string]*models.NotificationChannel
	subscriptions map[string]map[string]bool
	queue         []*models.Notification
}

type NotificationChannel string

const (
	ChannelEmail   NotificationChannel = "email"
	ChannelPush    NotificationChannel = "push"
	ChannelWebhook NotificationChannel = "webhook"
	ChannelSlack   NotificationChannel = "slack"
	ChannelSMS     NotificationChannel = "sms"
)

func NewNotificationService(cfg *config.Config) *NotificationService {
	svc := &NotificationService{
		cfg:           cfg,
		notifications: make(map[string]*models.Notification),
		channels:      make(map[string]*models.NotificationChannel),
		subscriptions: make(map[string]map[string]bool),
		queue:         []*models.Notification{},
	}
	svc.initializeDefaultChannels()
	go svc.processQueue()
	return svc
}

func (s *NotificationService) initializeDefaultChannels() {
	defaultChannels := []*models.NotificationChannel{
		{
			ChannelID:   "email-default",
			Name:        "Email Notifications",
			Type:        string(ChannelEmail),
			Enabled:     true,
			Config:      map[string]interface{}{"smtp_host": "smtp.example.com", "smtp_port": 587},
			CreatedAt:   time.Now(),
			LastUsedAt:  nil,
		},
		{
			ChannelID:   "webhook-default",
			Name:        "Webhook Notifications",
			Type:        string(ChannelWebhook),
			Enabled:     true,
			Config:      map[string]interface{}{"url": "https://hooks.example.com/webhook"},
			CreatedAt:   time.Now(),
			LastUsedAt:  nil,
		},
	}
	for _, ch := range defaultChannels {
		s.channels[ch.ChannelID] = ch
	}
}

func (s *NotificationService) Create(ctx context.Context, notif *models.Notification) (*models.Notification, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if notif.NotificationID == "" {
		notif.NotificationID = fmt.Sprintf("notif-%d", time.Now().UnixNano())
	}
	if notif.CreatedAt.IsZero() {
		notif.CreatedAt = time.Now()
	}
	if notif.Status == "" {
		notif.Status = models.NotificationStatusPending
	}

	s.notifications[notif.NotificationID] = notif
	s.queue = append(s.queue, notif)

	return notif, nil
}

func (s *NotificationService) Get(ctx context.Context, notifID string) (*models.Notification, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	notif, ok := s.notifications[notifID]
	if !ok {
		return nil, fmt.Errorf("notification not found: %s", notifID)
	}
	return notif, nil
}

func (s *NotificationService) List(ctx context.Context, filter *models.NotificationFilter) ([]*models.Notification, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []*models.Notification
	for _, notif := range s.notifications {
		if filter != nil {
			if filter.UserID != "" && notif.UserID != filter.UserID {
				continue
			}
			if filter.Status != "" && string(notif.Status) != filter.Status {
				continue
			}
			if filter.Type != "" && notif.Type != filter.Type {
				continue
			}
		}
		result = append(result, notif)
	}
	return result, nil
}

func (s *NotificationService) MarkAsRead(ctx context.Context, notifID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	notif, ok := s.notifications[notifID]
	if !ok {
		return fmt.Errorf("notification not found: %s", notifID)
	}

	notif.Read = true
	notif.ReadAt = new(time.Time)
	*notif.ReadAt = time.Now()

	return nil
}

func (s *NotificationService) MarkAllAsRead(ctx context.Context, userID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	for _, notif := range s.notifications {
		if notif.UserID == userID && !notif.Read {
			notif.Read = true
			notif.ReadAt = &now
		}
	}

	return nil
}

func (s *NotificationService) Delete(ctx context.Context, notifID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.notifications[notifID]; !ok {
		return fmt.Errorf("notification not found: %s", notifID)
	}

	delete(s.notifications, notifID)
	return nil
}

func (s *NotificationService) CreateChannel(ctx context.Context, channel *models.NotificationChannel) (*models.NotificationChannel, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if channel.ChannelID == "" {
		channel.ChannelID = fmt.Sprintf("channel-%d", time.Now().UnixNano())
	}
	if channel.CreatedAt.IsZero() {
		channel.CreatedAt = time.Now()
	}

	s.channels[channel.ChannelID] = channel
	return channel, nil
}

func (s *NotificationService) GetChannel(ctx context.Context, channelID string) (*models.NotificationChannel, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	channel, ok := s.channels[channelID]
	if !ok {
		return nil, fmt.Errorf("channel not found: %s", channelID)
	}
	return channel, nil
}

func (s *NotificationService) UpdateChannel(ctx context.Context, channel *models.NotificationChannel) (*models.NotificationChannel, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.channels[channel.ChannelID]; !ok {
		return nil, fmt.Errorf("channel not found: %s", channel.ChannelID)
	}

	s.channels[channel.ChannelID] = channel
	return channel, nil
}

func (s *NotificationService) DeleteChannel(ctx context.Context, channelID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.channels[channelID]; !ok {
		return fmt.Errorf("channel not found: %s", channelID)
	}

	delete(s.channels, channelID)
	return nil
}

func (s *NotificationService) ListChannels(ctx context.Context) ([]*models.NotificationChannel, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	channels := make([]*models.NotificationChannel, 0, len(s.channels))
	for _, ch := range s.channels {
		channels = append(channels, ch)
	}
	return channels, nil
}

func (s *NotificationService) Subscribe(ctx context.Context, userID, channelID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.channels[channelID]; !ok {
		return fmt.Errorf("channel not found: %s", channelID)
	}

	if s.subscriptions[userID] == nil {
		s.subscriptions[userID] = make(map[string]bool)
	}

	s.subscriptions[userID][channelID] = true
	return nil
}

func (s *NotificationService) Unsubscribe(ctx context.Context, userID, channelID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if subs, ok := s.subscriptions[userID]; ok {
		delete(subs, channelID)
	}

	return nil
}

func (s *NotificationService) GetSubscriptions(ctx context.Context, userID string) ([]string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var channelIDs []string
	if subs, ok := s.subscriptions[userID]; ok {
		for chID := range subs {
			channelIDs = append(channelIDs, chID)
		}
	}

	return channelIDs, nil
}

func (s *NotificationService) SendImmediate(ctx context.Context, notif *models.Notification) error {
	s.mu.Lock()
	notif.Status = models.NotificationStatusSent
	notif.SentAt = new(time.Time)
	*notif.SentAt = time.Now()
	s.mu.Unlock()

	return s.deliverNotification(notif)
}

func (s *NotificationService) processQueue() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		s.mu.Lock()
		if len(s.queue) == 0 {
			s.mu.Unlock()
			continue
		}

		notif := s.queue[0]
		s.queue = s.queue[1:]
		s.mu.Unlock()

		s.deliverNotification(notif)

		s.mu.Lock()
		notif.Status = models.NotificationStatusSent
		notif.SentAt = new(time.Time)
		*notif.SentAt = time.Now()
		s.mu.Unlock()
	}
}

func (s *NotificationService) deliverNotification(notif *models.Notification) error {
	fmt.Printf("Delivering notification %s to %s via %s\n", 
		notif.NotificationID, notif.UserID, notif.Channel)

	notif.DeliveryAttempts++
	notif.LastAttemptAt = new(time.Time)
	*notif.LastAttemptAt = time.Now()

	if notif.DeliveryAttempts >= 3 {
		notif.Status = models.NotificationStatusFailed
	}

	return nil
}

func (s *NotificationService) GetStats(ctx context.Context) (*models.NotificationStats, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	stats := &models.NotificationStats{
		Total:        len(s.notifications),
		Pending:      0,
		Sent:         0,
		Failed:       0,
		Read:         0,
		Unread:       0,
		DeliveryRate: 0,
	}

	for _, notif := range s.notifications {
		switch notif.Status {
		case models.NotificationStatusPending:
			stats.Pending++
		case models.NotificationStatusSent:
			stats.Sent++
		case models.NotificationStatusFailed:
			stats.Failed++
		}

		if notif.Read {
			stats.Read++
		} else {
			stats.Unread++
		}
	}

	if stats.Total > 0 {
		stats.DeliveryRate = float64(stats.Sent) / float64(stats.Total) * 100
	}

	return stats, nil
}