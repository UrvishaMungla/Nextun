from django.shortcuts import render
from django.contrib.auth import get_user_model, authenticate, update_session_auth_hash
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
from django.db.models import Sum
from .strategy_backtest import backtest_strategy
from .liquidity_trap_backtest import backtest_liquidity_trap
import random
from .dbtp_dbbtm import get_signal
from .exness_gateway import ExnessDummyGateway
import MetaTrader5 as mt5

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


import threading
from collections import deque

# ── Background Bot Engine (runs inside Django process) ──────────
_bot_threads = {}   # user_id -> threading.Event (stop flag)
_bot_logs = {}      # user_id -> deque of log strings (max 50)

# Map Yahoo-style symbols to MT5 symbols (Exness Standard uses 'm' suffix)
SYMBOL_MAP = {
    'EURUSD=X': 'EURUSDm', 'GBPUSD=X': 'GBPUSDm', 'USDJPY=X': 'USDJPYm',
    'AUDUSD=X': 'AUDUSDm', 'BTC-USD': 'BTCUSDm', 'ETH-USD': 'ETHUSDm',
    'GC=F': 'XAUUSDm', 'SI=F': 'XAGUSDm',
}
# Map Yahoo-style timeframes to MT5 timeframe keys
TF_MAP = {
    '1m': 'M1', '5m': 'M5', '15m': 'M15', '30m': 'M30', '45m': 'M30',
    '1h': 'H1', '2h': 'H1', '4h': 'H4', '1d': 'H4',
}


def _bot_log(user_id, msg):
    """Add a log message to the user's bot log buffer and print to terminal."""
    if user_id not in _bot_logs:
        _bot_logs[user_id] = deque(maxlen=50)
    _bot_logs[user_id].append(msg)
    print(f"[BOT] {msg}")


def _run_bot_loop(user_id, stop_event):
    """Background thread that scans for patterns every 30 seconds."""
    import time as _time
    from .dbtp_dbbtm import get_signal
    from .models import CustomUser, Trade

    _bot_log(user_id, "Bot engine started!")

    while not stop_event.is_set():
        try:
            user = CustomUser.objects.get(id=user_id)
            if not user.activeStrategy or not user.active_symbol:
                _bot_log(user_id, "No active strategy found. Stopping.")
                break

            raw_symbol = user.active_symbol
            raw_tf = user.active_timeframe

            mt5_symbol = SYMBOL_MAP.get(raw_symbol, raw_symbol)
            mt5_tf = TF_MAP.get(raw_tf, raw_tf)

            now_str = datetime.now().strftime("%H:%M:%S")
            _bot_log(user_id, f"[{now_str}] Scanning {mt5_symbol} ({mt5_tf}) — fetching 300 candles from MT5...")

            if user.activeStrategy.name == 'Liquidity Trap & Inducement':
                from .liquidity_trap_mt5 import get_signal
            else:
                from .dbtp_dbbtm import get_signal

            signal = get_signal(mt5_symbol, mt5_tf)
            action = signal.get("action", "NONE")

            if action in ["BUY", "SELL"]:
                _bot_log(user_id, f"[{now_str}] PATTERN FOUND! {action} on {mt5_symbol}")
                volume = signal.get("volume", 0.01)
                sl = signal.get("sl", 150)
                tp = signal.get("tp", 300)

                # Execute REAL trade on MT5
                from .dbtp_dbbtm import place_real_mt5_trade
                success, msg, entry_price = place_real_mt5_trade(mt5_symbol, action, volume, sl, tp)

                if success:
                    Trade.objects.create(
                        user=user, symbol=mt5_symbol, type=action,
                        quantity=volume, entryPrice=entry_price, currentPrice=entry_price,
                        pnl=0.0, status='OPEN'
                    )
                    _bot_log(user_id, f"[{now_str}] Trade placed on MT5! {action} {mt5_symbol} vol={volume} SL={sl} TP={tp}")
                    _bot_log(user_id, f"[{now_str}] MT5 Response: {msg}")
                else:
                    _bot_log(user_id, f"[{now_str}] Trade failed: {msg}")

            elif action in ["CLOSE_BUY", "CLOSE_SELL"]:
                _bot_log(user_id, f"[{now_str}] Signal to {action} on {mt5_symbol} (opposing position)")
                from .dbtp_dbbtm import close_mt5_position
                success, msg = close_mt5_position(mt5_symbol)
                if success:
                    _bot_log(user_id, f"[{now_str}] Successfully closed position on MT5! {msg}")
                    # Update trade status in DB
                    open_trades = Trade.objects.filter(user=user, symbol=mt5_symbol, status='OPEN')
                    for t in open_trades:
                        t.status = 'CLOSED'
                        t.save()
                else:
                    _bot_log(user_id, f"[{now_str}] Failed to close position: {msg}")
            else:
                _bot_log(user_id, f"[{now_str}] No pattern on {mt5_symbol} ({mt5_tf}). Next scan in 30s...")

        except Exception as e:
            _bot_log(user_id, f"Error: {e}")

        # Sleep in small chunks so we can stop quickly
        for _ in range(30):
            if stop_event.is_set():
                break
            _time.sleep(1)

    _bot_log(user_id, "Bot engine stopped.")


class ToggleStrategyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        strategy_id = request.data.get('strategyId')
        symbol = request.data.get('symbol')
        timeframe = request.data.get('timeframe')
        user = request.user
        if strategy_id:
            try:
                # Auto-create strategy if it doesn't exist in the database (e.g. fresh AWS deployment)
                strategy, created = Strategy.objects.get_or_create(
                    id=strategy_id,
                    defaults={
                        'name': 'Double Top / Double Bottom' if strategy_id == 1 else 'Liquidity Trap & Inducement',
                        'description': 'Auto-created strategy',
                        'minCapital': '$500' if strategy_id == 1 else '$300',
                        'successRate': '~43%' if strategy_id == 1 else '~52%',
                        'riskReward': '1:2'
                    }
                )
                # Toggle: if already active, deactivate
                if user.activeStrategy and user.activeStrategy.id == strategy.id:
                    user.activeStrategy = None
                    user.active_symbol = None
                    user.active_timeframe = None
                    user.save()

                    # Stop the background bot thread
                    stop_event = _bot_threads.pop(user.id, None)
                    if stop_event:
                        stop_event.set()

                    # Close actual open trades on MT5
                    from .models import Trade
                    from .dbtp_dbbtm import close_mt5_position
                    
                    open_trades = Trade.objects.filter(user=user, status='OPEN')
                    for trade in open_trades:
                        success, msg = close_mt5_position(trade.symbol)
                        # Optionally log it or just let it close
                        trade.status = 'CLOSED'
                        trade.save()

                    return Response({'success': True, 'message': 'Strategy stopped'})
                else:
                    user.activeStrategy = strategy
                    user.active_symbol = symbol
                    user.active_timeframe = timeframe
                    user.save()

                    # Stop any existing bot thread for this user first
                    old_event = _bot_threads.pop(user.id, None)
                    if old_event:
                        old_event.set()

                    # Clear old logs
                    _bot_logs.pop(user.id, None)

                    # Start a new background bot thread
                    stop_event = threading.Event()
                    _bot_threads[user.id] = stop_event
                    t = threading.Thread(
                        target=_run_bot_loop,
                        args=(user.id, stop_event),
                        daemon=True
                    )
                    t.start()

                    return Response({'success': True, 'message': 'Strategy activated', 'data': StrategySerializer(strategy).data})
            except Strategy.DoesNotExist:
                return Response({'success': False, 'message': 'Strategy not found'}, status=404)
        return Response({'success': False, 'message': 'strategyId required'}, status=400)


class BotStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        is_running = user.id in _bot_threads and not _bot_threads[user.id].is_set()
        logs = list(_bot_logs.get(user.id, []))
        return Response({
            'success': True,
            'running': is_running,
            'symbol': user.active_symbol,
            'timeframe': user.active_timeframe,
            'strategy_name': user.activeStrategy.name if user.activeStrategy else None,
            'logs': logs
        })


# ─────────────── Trades API ───────────────
class TradesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            open_trades = Trade.objects.filter(user=request.user, status='OPEN')
            if open_trades.exists():
                import MetaTrader5 as mt5
                from .dbtp_dbbtm import initialize
                if initialize():
                    for trade in open_trades:
                        positions = mt5.positions_get(symbol=trade.symbol)
                        found = False
                        if positions:
                            for pos in positions:
                                pos_type = 'BUY' if pos.type == mt5.ORDER_TYPE_BUY else 'SELL'
                                if pos_type == trade.type:
                                    trade.currentPrice = pos.price_current
                                    trade.pnl = pos.profit
                                    trade.save()
                                    found = True
                                    break
                        if not found:
                            trade.status = 'CLOSED'
                            trade.save()
        except Exception as e:
            print(f"Error syncing MT5 trades: {e}")

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
        agg = all_trades.aggregate(total_pnl=Sum('pnl'))
        total_pnl = agg['total_pnl'] or 0.0
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


# ─────────────── Live Execution API ───────────────
class ExecuteStrategyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        symbol = request.data.get('symbol')
        timeframe = request.data.get('timeframe')

        if not user.isExnessConnected:
            return Response({'success': False, 'message': 'You must connect Exness first.'}, status=400)

        # 1. Evaluate Strategy
        if user.activeStrategy and user.activeStrategy.name == 'Liquidity Trap & Inducement':
            from .liquidity_trap_mt5 import get_signal
        else:
            from .dbtp_dbbtm import get_signal

        signal = get_signal(symbol, timeframe)
        
        action = signal.get("action", "NONE")
        if action == "NONE":
            strategy_name = user.activeStrategy.name if user.activeStrategy else "selected strategy"
            return Response({
                'success': True, 
                'message': f"No {strategy_name} pattern found on {symbol} ({timeframe}) right now.",
                'trade_placed': False
            })

        # 2. Extract signal details
        # For CLOSE_BUY/CLOSE_SELL, we would handle differently. Let's just handle BUY/SELL for now.
        if action not in ["BUY", "SELL"]:
            return Response({
                'success': True, 
                'message': f"Action '{action}' is not supported for manual execution yet.",
                'trade_placed': False
            })

        volume = signal.get("volume", 0.01)
        sl = signal.get("sl", 150)
        tp = signal.get("tp", 300)

        # 3. Connect to Exness and place trade
        gateway = ExnessDummyGateway(
            account_id=user.exnessAccountId,
            password=user.exnessPassword,
            server=user.exnessServer
        )

        try:
            result = gateway.place_simulated_order(
                symbol=symbol,
                action_type=action,
                volume=volume,
                stop_loss_points=sl,
                take_profit_points=tp
            )
        except Exception as e:
            gateway.close_session()
            return Response({'success': False, 'message': f"Failed to execute trade: {str(e)}"}, status=500)

        gateway.close_session()

        if result is None or result.retcode != mt5.TRADE_RETCODE_DONE:
            reason = result.comment if result else "Unknown MT5 Error"
            return Response({'success': False, 'message': f"Exness rejected trade: {reason}"}, status=400)

        # 4. Save to Django DB
        Trade.objects.create(
            user=user,
            symbol=symbol,
            type=action,
            quantity=volume,
            entryPrice=result.price,
            currentPrice=result.price,
            pnl=0.0,
            status='OPEN'
        )

        return Response({
            'success': True,
            'message': f"Successfully placed {action} trade on {symbol} at {result.price}!",
            'trade_placed': True
        })
