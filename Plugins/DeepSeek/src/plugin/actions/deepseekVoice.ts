import { usePluginStore, useWatchEvent } from '@/hooks/plugin';
import { useEventStore } from '@/hooks/event';

export default function(name: string) {
  const ActionID = `${window.argv[3].plugin.uuid}.${name}`;
  
  // 事件侦听器
  const plugin = usePluginStore();
  const eventStore = useEventStore();

  useWatchEvent('action', {
    ActionID,
    willAppear({ context, payload }) {
      console.log('创建:', context);
    },
    didReceiveSettings({ context, payload }) {
      console.log('接收到设置:', payload);
    },
    sendToPlugin({ context, payload }) {
      console.log('发送到插件:', payload);
    },
    keyDown(data) {
      eventStore.emit('keyDown', data); // 传递实际的数据
    },
    keyUp(data) {
      eventStore.emit('keyUp', data); // 传递实际的数据
    }
  });
}