import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.PUSHER_CLUSTER || 'mt1',
  useTLS: true,
});

export const triggerNotification = async (userId, payload) => {
  try {
    const channel = `notifications-${userId}`;
    await pusher.trigger(channel, 'notification', payload);
  } catch (err) {
    console.error('Pusher trigger failed', err);
  }
};

export default pusher;
