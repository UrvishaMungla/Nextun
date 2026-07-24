from django.db import models
from django.contrib.auth.models import AbstractUser

class Strategy(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField()
    minCapital = models.CharField(max_length=255)
    successRate = models.CharField(max_length=255)
    riskReward = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    angelOneClientCode = models.CharField(max_length=255, null=True, blank=True)
    angelOneTotpSecret = models.CharField(max_length=255, null=True, blank=True)
    angelOneJwtToken = models.TextField(null=True, blank=True)
    angelOneRefreshToken = models.TextField(null=True, blank=True)
    isAngelOneConnected = models.BooleanField(default=False)
    exnessAccountId = models.CharField(max_length=255, null=True, blank=True)
    exnessPassword = models.CharField(max_length=255, null=True, blank=True)
    exnessServer = models.CharField(max_length=255, null=True, blank=True)
    isExnessConnected = models.BooleanField(default=False)
    activeStrategy = models.ForeignKey(Strategy, on_delete=models.SET_NULL, null=True, blank=True)
    active_symbol = models.CharField(max_length=50, null=True, blank=True)
    active_timeframe = models.CharField(max_length=10, null=True, blank=True)
    is2FAEnabled = models.BooleanField(default=False)
    # Notifications (can be stored as JSON, but let's break them down or use JSONField)
    notifications = models.JSONField(default=dict)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email

class DailyPnl(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    date = models.CharField(max_length=10) # Format YYYY-MM-DD
    pnl = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'date')

    def __str__(self):
        return f"{self.user.email} - {self.date}"

class Trade(models.Model):
    TRADE_TYPES = (
        ('BUY', 'BUY'),
        ('SELL', 'SELL'),
    )
    STATUS_CHOICES = (
        ('OPEN', 'OPEN'),
        ('CLOSED', 'CLOSED'),
    )

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    symbol = models.CharField(max_length=255)
    type = models.CharField(max_length=10, choices=TRADE_TYPES)
    quantity = models.FloatField()
    entryPrice = models.FloatField()
    currentPrice = models.FloatField()
    pnl = models.FloatField(default=0.0)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='OPEN')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.symbol} - {self.type} - {self.status}"

class UserActiveStrategy(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='active_strategies')
    strategy = models.ForeignKey(Strategy, on_delete=models.CASCADE)
    symbol = models.CharField(max_length=50)
    timeframe = models.CharField(max_length=10)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'strategy')

    def __str__(self):
        return f"{self.user.email} - {self.strategy.name}"
