from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from .models import ChatMessage, ChatParticipant, ChatRoom


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get('user')
        if not user or user.is_anonymous:
            await self.close(code=4401)
            return

        self.group_name = f'user_notifications_{user.id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send_json({'type': 'connected'})

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        if content.get('type') == 'ping':
            await self.send_json({'type': 'pong'})

    async def notification_event(self, event):
        await self.send_json({'type': 'notification_event', 'event': event.get('event', 'updated')})


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get('user')
        if not user or user.is_anonymous:
            await self.close(code=4401)
            return

        room_uid = self.scope.get('url_route', {}).get('kwargs', {}).get('room_uid')
        if not room_uid:
            await self.close(code=4400)
            return

        room = await self._get_room_for_user(room_uid, user.id)
        if not room:
            await self.close(code=4403)
            return

        self.room_uid = room_uid
        self.group_name = f'chat_room_{room_uid}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send_json({'type': 'connected', 'roomId': room_uid})

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        payload_type = content.get('type')
        room_uid = getattr(self, 'room_uid', None)
        user = self.scope.get('user')
        if not room_uid or not user or user.is_anonymous:
            return

        if payload_type == 'typing_start':
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'chat_event',
                    'event_type': 'typing_start',
                    'payload': {'roomId': room_uid, 'userId': await self._user_uid(user.id)},
                },
            )
            return
        if payload_type == 'typing_stop':
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'chat_event',
                    'event_type': 'typing_stop',
                    'payload': {'roomId': room_uid, 'userId': await self._user_uid(user.id)},
                },
            )
            return
        if payload_type == 'send_message':
            text = (content.get('content') or '').strip()
            if not text:
                return
            message_payload = await self._create_message(room_uid, user.id, text)
            if message_payload:
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        'type': 'chat_event',
                        'event_type': 'message_created',
                        'payload': message_payload,
                    },
                )

    async def chat_event(self, event):
        await self.send_json({
            'type': 'chat_event',
            'eventType': event.get('event_type'),
            'payload': event.get('payload', {}),
        })

    @database_sync_to_async
    def _get_room_for_user(self, room_uid: str, user_id: int):
        return ChatRoom.objects.filter(uid=room_uid, chat_participants__user_id=user_id).first()

    @database_sync_to_async
    def _user_uid(self, user_id: int):
        participant = ChatParticipant.objects.select_related('user__profile').filter(user_id=user_id).first()
        return participant.user.profile.uid if participant and hasattr(participant.user, 'profile') else None

    @database_sync_to_async
    def _create_message(self, room_uid: str, user_id: int, text: str):
        room = ChatRoom.objects.filter(uid=room_uid, chat_participants__user_id=user_id).first()
        if not room:
            return None
        message = ChatMessage.objects.create(room=room, sender_id=user_id, content=text)
        room.save(update_fields=['updated_at'])
        sender = message.sender
        sender_name = sender.get_full_name() or sender.username
        sender_avatar = getattr(sender.profile, 'avatar', '') if hasattr(sender, 'profile') else ''
        return {
            'id': message.uid,
            'roomId': room.uid,
            'senderId': sender.profile.uid if hasattr(sender, 'profile') else None,
            'senderName': sender_name,
            'senderAvatar': sender_avatar,
            'content': message.content,
            'isEdited': False,
            'isDeleted': False,
            'createdAt': message.created_at.isoformat(),
            'updatedAt': message.updated_at.isoformat(),
        }
