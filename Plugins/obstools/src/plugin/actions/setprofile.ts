import { usePluginStore, useWatchEvent } from '@/hooks/plugin';
import { log, profile } from 'node:console';

export default function (name: string) {
  const ActionID = `${window.argv[3].plugin.uuid}.${name}`;

  // 事件侦听器
  const plugin = usePluginStore();

  const timer = {};
  useWatchEvent('action', {
    ActionID,
    async willAppear(data) {
      // console.log('创建:', data);
      const context = data.context;
      const settings = plugin.getAction(context).settings as any;
      if('profile' in settings) {
        plugin.getAction(context).setTitle(settings.profile);
        const currentProfile = await getCurrentProfile();
        if(settings.profile === currentProfile) {
          plugin.getAction(context).setState(1);
        }else {
          plugin.getAction(context).setState(0);
        }
      }
      plugin.obs.on('CurrentProfileChanged', (data) => {
        const settings = plugin.getAction(context).settings as any;
        if(settings.profile === data.profileName) {
          plugin.getAction(context).setState(1);
        }else {
          plugin.getAction(context).setState(0);
        }

      });
      
    },
    willDisappear({ context }) {
      plugin.Unterval(context);
    },
    async keyUp({ payload, context }) {
      const settings = payload.settings;
      console.log(settings);
      setProfile(settings.profile);
    },
    async propertyInspectorDidAppear(data) {
      const { context } = data;
      const arr = []
      // 获取场景信息
      // console.log(plugin.obs);
      if (plugin.obs) {
        try{
          let profileList = await getProfileList();
          profileList = profileList.map(p => ({key: p, value: p}));
          plugin.getAction(context).sendToPropertyInspector({ profileList: profileList })
        } catch (err) {
          console.log(err);
          setTimeout(() => {
            this.propertyInspectorDidAppear(data)
          }, 500);
        }
      } else {
        setTimeout(() => {
          this.propertyInspectorDidAppear(data)
        }, 500);
      }

    },
    async sendToPlugin({ payload, context }) {

    },
    async didReceiveSettings({ context, payload }) {
      const settings = (payload.settings as any);
      console.log(settings);
      if('profile' in settings) {
        plugin.getAction(context).setTitle(settings.profile);
        const currentProfile = await getCurrentProfile();
        if(settings.profile === currentProfile) {
          plugin.getAction(context).setState(1);
        }else {
          plugin.getAction(context).setState(0);
        }
      }
    }
  });
  /**
 * 获取当前使用的配置文件
 * @returns {Promise<string>} 当前配置文件名
 */
async function getCurrentProfile() {
  try {
    const result = await plugin.obs.call('GetProfileList');
    return result.currentProfileName;
  } catch (error) {
    console.error('获取当前配置文件失败:', error);
    throw error;
  }
}

/**
 * 获取所有配置文件列表
 * @returns {Promise<string[]>} 配置文件名数组
 */
async function getProfileList() {
  try {
    const result = await plugin.obs.call('GetProfileList');
    return result.profiles.map(p => p);
  } catch (error) {
    console.error('获取配置文件列表失败:', error);
    throw error;
  }
}
/**
 * 设置当前配置文件
 * @param {string} profileName - 要设置的配置文件名
 * @returns {Promise<boolean>} 是否设置成功
 */
async function setProfile(profileName) {
  try {
    // 先获取所有配置文件验证是否存在
    const profiles = await getProfileList();
    if (!profiles.includes(profileName)) {
      throw new Error(`配置文件 "${profileName}" 不存在`);
    }
    
    await plugin.obs.call('SetCurrentProfile', {
      profileName: profileName
    });
    
    // 验证是否设置成功
    const current = await getCurrentProfile();
    return current === profileName;
    
  } catch (error) {
    console.error('设置配置文件失败:', error);
    throw error;
  }
}
}
