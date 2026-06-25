from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Trade, DailyPnl, Strategy

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    username = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['email', 'username', 'password']

    def create(self, validated_data):
        email = validated_data['email']
        username = validated_data.get('username')
        if not username:
            username = email.split('@')[0]
        
        # Ensure username is unique in database
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        user = User.objects.create_user(
            email=email,
            username=username,
            password=validated_data['password']
        )
        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username',
            'angelOneClientCode', 'isAngelOneConnected',
            'exnessAccountId', 'exnessServer', 'isExnessConnected',
            'is2FAEnabled', 'notifications', 'activeStrategy'
        ]

class UserSettingsUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'is2FAEnabled', 'notifications']
        extra_kwargs = {
            'username': {'required': False},
        }

class StrategySerializer(serializers.ModelSerializer):
    class Meta:
        model = Strategy
        fields = '__all__'

class TradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trade
        fields = '__all__'

class DailyPnlSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyPnl
        fields = '__all__'
