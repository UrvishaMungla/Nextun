from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenRefreshView
from .views import VerifyLoginOtpView

urlpatterns = [
    # API Root
    path('', views.ApiRootView.as_view(), name='api_root'),

    # Auth
    path('auth/register', views.RegisterView.as_view(), name='register'),
    path('auth/verify-register-otp', views.VerifyRegisterOtpView.as_view(), name='verify-register-otp'),
    path('auth/login', views.LoginView.as_view(), name='login'),
    path('auth/verify-login-otp', views.VerifyLoginOtpView.as_view(), name='verify-login-otp'),
    path('auth/refresh', TokenRefreshView.as_view(), name='token_refresh'),

    # User
    path('user/settings', views.UserSettingsView.as_view(), name='user_settings'),
    path('user/password', views.ChangePasswordView.as_view(), name='change_password'),

    # Strategies
    path('strategies', views.StrategiesView.as_view(), name='strategies'),
    path('strategies/toggle', views.ToggleStrategyView.as_view(), name='toggle_strategy'),
    path('strategy/backtest', views.BacktestStrategyView.as_view(), name='strategy_backtest'),
    path('strategy/execute', views.ExecuteStrategyView.as_view(), name='strategy_execute'),
    path('bot/status', views.BotStatusView.as_view(), name='bot_status'),

    # Trades
    path('trades', views.TradesView.as_view(), name='trades'),

    # PnL Calendar
    path('pnl/calendar', views.PnlCalendarView.as_view(), name='pnl_calendar'),

    # Angel One
    path('angelone/connect', views.AngelOneConnectView.as_view(), name='angelone_connect'),
    path('angelone/verify-otp', views.AngelOneVerifyOtpView.as_view(), name='angelone_verify_otp'),
    path('angelone/generate-totp', views.AngelOneGenerateTotpView.as_view(), name='angelone_generate_totp'),

    # Exness
    path('exness/connect', views.ExnessConnectView.as_view(), name='exness_connect'),
    path('exness/dashboard', views.ExnessDashboardView.as_view(), name='exness_dashboard'),
    path('exness/disconnect', views.ExnessDisconnectView.as_view(), name='exness_disconnect'),
]
