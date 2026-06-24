from django.contrib import admin
from django.urls import path, include
from api import views

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Frontend Routes
    path('', views.index_view, name='index'),
    path('dashboard', views.dashboard_view, name='dashboard'),
    path('dashboard/', views.dashboard_view, name='dashboard_slash'),
    path('pricing', views.pricing_view, name='pricing'),
    path('pricing/', views.pricing_view, name='pricing_slash'),
    path('settings', views.settings_view, name='settings'),
    path('settings/', views.settings_view, name='settings_slash'),
    path('signup', views.signup_view, name='signup'),
    path('signup/', views.signup_view, name='signup_slash'),
    path('strategies', views.strategies_view, name='strategies'),
    path('strategies/', views.strategies_view, name='strategies_slash'),
    path('trades', views.trades_view, name='trades'),
    path('trades/', views.trades_view, name='trades_slash'),

    # API Routes
    path('api/', include('api.urls')),
]
