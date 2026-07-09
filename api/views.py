from django.shortcuts import render
from django.contrib.auth import get_user_model, authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Trade, DailyPnl, Strategy
from .serializers import (
    RegisterSerializer, LoginSerializer, UserSerializer,
    UserSettingsUpdateSerializer, StrategySerializer,
    TradeSerializer, DailyPnlSerializer
)
from datetime import datetime, date
from django.utils import timezone
from .strategy_backtest import backtest_strategy
from .liquidity_trap_backtest import backtest_liquidity_trap
import random

from django.core.mail import send_mail

from django.conf import settings

User = get_user_model()

# ─────────────── Frontend Template Views ───────────────
def index_view(request):
    return render(request, 'index.html')

def dashboard_view(request):
    return render(request, 'dashboard.html')

def pricing_view(request):
    return render(request, 'pricing.html')

def settings_view(request):
    return render(request, 'settings.html')

def signup_view(request):
    return render(request, 'signup.html')

def strategies_view(request):
    return render(request, 'strategies.html')

def trades_view(request):
    return render(request, 'trades.html')


# ─────────────── Auth API ───────────────
class ApiRootView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            'success': True,
            'message': 'Nextun API is running successfully.',
            'version': '1.0'
        })


SIGNUP_OTP = {}
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = request.data.get('password')
            
            # Generate OTP
            otp = str(random.randint(100000, 999999))
            SIGNUP_OTP[email] = {'password': password, 'otp': otp}

            # Send OTP
            try:
                send_mail(
                    subject="Nextun Signup Verification",
                    message=f"Your signup OTP is {otp}",
                    from_email=settings.EMAIL_HOST_USER,
                    recipient_list=[email],
                    fail_silently=False
                )
            except Exception as e:
                print(f"[Nextun] Email send warning: {e}")

            response_data = {
                "success": True,
                "message": "OTP Sent"
            }
            if settings.DEBUG:
                response_data["otp"] = otp
                print(f"[Nextun DEV] Signup OTP for {email}: {otp}")

            return Response(response_data, status=status.HTTP_200_OK)
        return Response({'success': False, 'message': serializer.errors}, status=400)

class VerifyRegisterOtpView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        otp = request.data.get("otp")

        stored_data = SIGNUP_OTP.get(email)
        if stored_data and stored_data['otp'] == otp:
            password = stored_data['password']
            
            # Use serializer to create user properly
            serializer = RegisterSerializer(data={'email': email, 'password': password})
            if serializer.is_valid():
                user = serializer.save()
                del SIGNUP_OTP[email]
                
                refresh = RefreshToken.for_user(user)
                return Response({
                    'success': True,
                    'token': str(refresh.access_token),
                    'refresh': str(refresh),
                    'user': UserSerializer(user).data
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({'success': False, 'message': serializer.errors}, status=400)
            
        return Response({
            "success": False,
            "message": "Invalid OTP"
        }, status=400)

LOGIN_OTP = {}
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            user = authenticate(request, username=email, password=password)
            if user:
                otp = str(random.randint(100000, 999999))

                LOGIN_OTP[email] = otp

                # Send OTP via configured email backend (console in dev, SMTP in prod)
                try:
                    send_mail(
                        subject="Nextun Login Verification",
                        message=f"Your OTP is {otp}",
                        from_email=settings.EMAIL_HOST_USER,
                        recipient_list=[email],
                        fail_silently=False
                    )
                except Exception as e:
                    # Log the error but don't block login in development
                    print(f"[Nextun] Email send warning: {e}")

                refresh = RefreshToken.for_user(user)

                response_data = {
                    "success": True,
                    "message": "OTP Sent",
                    "token": str(refresh.access_token),
                    "refresh": str(refresh)
                }

                # In DEBUG mode, return OTP in response so dev can log in without email
                if settings.DEBUG:
                    response_data["otp"] = otp
                    print(f"[Nextun DEV] OTP for {email}: {otp}")

                return Response(response_data)

            return Response({'success': False, 'message': 'Invalid credentials'}, status=401)
        return Response({'success': False, 'message': serializer.errors}, status=400)

class VerifyLoginOtpView(APIView):

    permission_classes=[AllowAny]

    def post(self,request):

        email=request.data.get("email")

        otp=request.data.get("otp")

        if LOGIN_OTP.get(email)==otp:

            del LOGIN_OTP[email]

            return Response({

                "success":True

            })

        return Response({

            "success":False,

            "message":"Invalid OTP"

        },status=400)

# ─────────────── User Settings API ───────────────
class UserSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'success': True, 'data': UserSerializer(request.user).data})

    def put(self, request):
        serializer = UserSettingsUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'success': True, 'data': UserSerializer(request.user).data})
        return Response({'success': False, 'message': serializer.errors}, status=400)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request):
        user = request.user
        current = request.data.get('currentPassword')
        new_pass = request.data.get('newPassword')
        if not user.check_password(current):
            return Response({'success': False, 'message': 'Current password is incorrect'}, status=400)
        user.set_password(new_pass)
        user.save()
        return Response({'success': True, 'message': 'Password updated successfully'})


# ─────────────── Strategies API ───────────────
class StrategiesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        strategies = Strategy.objects.all()
        user = request.user
        return Response({
            'success': True,
            'data': {
                'strategies': StrategySerializer(strategies, many=True).data,
                'activeStrategy': user.activeStrategy.id if user.activeStrategy else None
            }
        })


class ToggleStrategyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        strategy_id = request.data.get('strategyId')
        user = request.user
        if strategy_id:
            try:
                strategy = Strategy.objects.get(id=strategy_id)
                # Toggle: if already active, deactivate
                if user.activeStrategy and user.activeStrategy.id == strategy.id:
                    user.activeStrategy = None
                    user.save()
                    return Response({'success': True, 'message': 'Strategy deactivated'})
                else:
                    user.activeStrategy = strategy
                    user.save()
                    return Response({'success': True, 'message': 'Strategy activated', 'data': StrategySerializer(strategy).data})
            except Strategy.DoesNotExist:
                return Response({'success': False, 'message': 'Strategy not found'}, status=404)
        return Response({'success': False, 'message': 'strategyId required'}, status=400)


# ─────────────── Trades API ───────────────
class TradesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        filter_val = request.query_params.get('filter', 'ALL')
        sort_val = request.query_params.get('sort', 'DATE_DESC')
        trades = Trade.objects.filter(user=request.user)

        if filter_val == 'WIN':
            trades = trades.filter(pnl__gt=0)
        elif filter_val == 'LOSS':
            trades = trades.filter(pnl__lt=0)

        sort_map = {
            'DATE_DESC': '-created_at',
            'DATE_ASC': 'created_at',
            'PROFIT_DESC': '-pnl',
            'LOSS_DESC': 'pnl',
        }
        trades = trades.order_by(sort_map.get(sort_val, '-created_at'))

        all_trades = Trade.objects.filter(user=request.user)
        total_pnl = sum(t.pnl for t in all_trades)
        wins = all_trades.filter(pnl__gt=0).count()
        total = all_trades.count()
        win_rate = round((wins / total * 100), 1) if total else 0

        return Response({
            'success': True,
            'data': TradeSerializer(trades, many=True).data,
            'metrics': {
                'totalPnl': total_pnl,
                'winRate': win_rate,
                'totalTrades': total,
            }
        })


# ─────────────── PnL Calendar API ───────────────
class PnlCalendarView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        records = DailyPnl.objects.filter(user=request.user).order_by('date')
        return Response({
            'success': True,
            'data': DailyPnlSerializer(records, many=True).data
        })


ANGELONE_OTP = {}

# ─────────────── Angel One Connect API ───────────────
class AngelOneConnectView(APIView):
    """Step 1: Receives clientId + pin, sends OTP to user's email."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        client_code = request.data.get('clientId')
        password = request.data.get('pin')

        if not client_code or not password:
            return Response({'success': False, 'message': 'Client ID and PIN are required.'}, status=400)

        user = request.user
        otp = str(random.randint(100000, 999999))

        # Store temporarily (keyed by user email)
        ANGELONE_OTP[user.email] = {
            'otp': otp,
            'clientId': client_code,
            'pin': password,
        }

        # Send OTP to user's email
        try:
            send_mail(
                subject="Nextun — AngelOne Connection Verification",
                message=f"Your AngelOne connection OTP is: {otp}\n\nThis code expires in 5 minutes.",
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception as e:
            print(f"[Nextun] Email warning: {e}")

        response_data = {'success': True, 'message': 'OTP sent to your email.'}
        if settings.DEBUG:
            response_data['otp'] = otp
            print(f"[Nextun DEV] AngelOne OTP for {user.email}: {otp}")

        return Response(response_data)


class AngelOneVerifyOtpView(APIView):
    """Step 2: Verifies the OTP, then connects AngelOne."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        otp = request.data.get('otp', '').strip()
        user = request.user

        stored = ANGELONE_OTP.get(user.email)
        if not stored or stored['otp'] != otp:
            return Response({'success': False, 'message': 'Invalid OTP. Please try again.'}, status=400)

        # OTP matched — save credentials and connect
        user.angelOneClientCode = stored['clientId']
        user.isAngelOneConnected = True
        user.save()
        del ANGELONE_OTP[user.email]

        return Response({'success': True, 'message': 'AngelOne connected successfully!'})


class AngelOneGenerateTotpView(APIView):
    """Legacy — deprecated."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'success': False, 'message': 'This endpoint is deprecated.'}, status=410)


# ─────────────── Exness Connect/Disconnect API ───────────────
class ExnessConnectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        account_id = request.data.get('accountId')
        password = request.data.get('password')
        server = request.data.get('server', 'Exness-MT5Trial9')
        if not account_id or not password:
            return Response({'success': False, 'message': 'accountId and password required'}, status=400)
        user = request.user
        user.exnessAccountId = account_id
        user.exnessServer = server
        user.isExnessConnected = True
        user.save()
        return Response({'success': True, 'message': 'Exness connected successfully'})


class ExnessDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.isExnessConnected:
            return Response({'success': False, 'message': 'Exness not connected'}, status=400)
        # Return mock data; replace with real MT5 bridge data
        return Response({
            'success': True,
            'data': {
                'balance': 10000.0,
                'margin': 1200.0,
                'freeMargin': 8800.0,
                'equity': 10200.0,
            }
        })


class ExnessDisconnectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        user.isExnessConnected = False
        user.exnessAccountId = None
        user.exnessPassword = None
        user.exnessServer = None
        user.save()
        return Response({'success': True, 'message': 'Exness disconnected'})


# ─────────────── Strategy Backtest API ───────────────
class BacktestStrategyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        symbol = request.data.get('symbol', 'EURUSD=X')
        timeframe = request.data.get('timeframe', '1h')
        strategy_name = request.data.get('strategy_name', 'Double Top / Double Bottom')
        
        # Run the backtest engine based on strategy name
        try:
            use_market_hours = request.data.get('use_market_hours', False)
            if strategy_name == 'Liquidity Trap':
                results = backtest_liquidity_trap(symbol, timeframe=timeframe, use_market_hours=use_market_hours)
            else:
                results = backtest_strategy(symbol, timeframe=timeframe, use_market_hours=use_market_hours)
                
            if 'error' in results:
                return Response({'success': False, 'message': results['error']}, status=400)
            return Response({
                'success': True,
                'data': results
            })
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)
