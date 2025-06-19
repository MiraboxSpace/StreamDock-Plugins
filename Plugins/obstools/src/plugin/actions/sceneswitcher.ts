import { usePluginStore, useWatchEvent } from '@/hooks/plugin';
import { log } from 'node:console';

export default function (name: string) {
  const ActionID = `${window.argv[3].plugin.uuid}.${name}`;

  // 事件侦听器
  const plugin = usePluginStore();
  let removeListener = null;
  const timer = {};
  useWatchEvent('action', {
    ActionID,
    async willAppear(data) {
      // console.log('创建:', data);
      const context = data.context;
      const settings = data.payload.settings as any;
      const scene = await findSceneByUuid(settings.scene);
      plugin.getAction(context).setTitle(scene?.sceneName);
        // 获取初始场景
      try {
        drawIcon(context);
      } catch (error) {
        setTimeout(() => {
          this.willAppear(data);
        },500);
      }
      // 启动监听
      removeListener = setupSceneSwitchListener((fromScene, toScene) => {
        console.log(`场景从 ${fromScene} 切换到 ${toScene}`);
        // 可以在这里添加自定义逻辑
        drawIcon(context);
      });

      plugin.Interval(context, 5000, () => {
        drawIcon(context)
      })
    },
    willDisappear({ context }) {
      plugin.Unterval(context);
      if(removeListener && removeListener instanceof Function) removeListener()
    },
    async keyUp({ payload, context }) {
      const settings = payload.settings;
      switchScene(settings.scene);
    },
    propertyInspectorDidAppear(data) {
      const { context } = data;
      const arr = []
      // 获取场景信息
      // console.log(plugin.obs);
      if (plugin.obs) {
        plugin.obs?.call('GetSceneList').then(async (data) => {
          for (const scene of data.scenes) {
            const sceneItems = await plugin.obs.call('GetSceneItemList', {
              sceneName: scene.sceneName
            });
            arr.push(scene)
          }
          // console.log(arr);
          plugin.getAction(context).sendToPropertyInspector({ sceneList: arr })
        }).catch(err => {
          console.log(err);
          setTimeout(() => {
            this.propertyInspectorDidAppear(data)
          }, 500);
        });
      } else {
        setTimeout(() => {
          this.propertyInspectorDidAppear(data)
        }, 500);
      }

    },
    async sendToPlugin({ payload, context }) {
    },
    async didReceiveSettings({context, payload }) {
      const settings = payload.settings as any;
      const scene = await findSceneByUuid(settings.scene);
      plugin.getAction(context).setTitle(scene?.sceneName);
      drawIcon(context);
    }
  });
  /**
 * 通过UUID查找场景
 * @param {string} sceneUuid - 要查找的场景UUID
 * @returns {Promise<{name: string, uuid: string}|null>}
 */
async function findSceneByUuid(sceneUuid) {
  if(sceneUuid == "") return ""
  try {
    const response = await plugin.obs.call('GetSceneList');
    return response.scenes.find(scene => scene.sceneUuid === sceneUuid) || null;
  } catch (error) {
    console.error('通过UUID查找场景失败:', error);
    throw error;
  }
}
  /**
 * 切换场景
 * @param {string} sceneUuid - 要切换到的场景名称
 * @returns {Promise<boolean>} 是否切换成功
 */
async function switchScene(sceneUuid) {
  try {
    await plugin.obs.call('SetCurrentProgramScene', {
      'sceneUuid': sceneUuid
    });
    
    // 验证是否切换成功
    const current = await plugin.obs.call('GetCurrentProgramScene');
    return current.currentProgramSceneUuid === sceneUuid;
  } catch (error) {
    console.error(`切换场景到 "${sceneUuid}" 失败:`, error);
    throw error;
  }
}

/**
 * 设置场景切换监听器
 * @param {(from: string, to: string) => void} callback - 切换回调函数
 * @returns {() => void} 取消监听函数
 */
function setupSceneSwitchListener(callback) {
  let currentScene = '';
  
  // 获取初始场景
  plugin.obs.call('GetCurrentProgramScene').then(response => {
    currentScene = response.sceneName;
  });
  
  // 监听场景切换事件
  const handler = async (event) => {
    const newScene = event.sceneName;
    if (newScene && newScene !== currentScene) {
      callback(currentScene, newScene);
      currentScene = newScene;
    }
  };
  
  plugin.obs.on('CurrentProgramSceneChanged', handler);
  
  // 返回取消监听函数
  return () => {
    plugin.obs.off('CurrentProgramSceneChanged', handler);
  };
}

/**
 * 获取源截图
 * @param {string} sourceUuid - 源名称
 * @param {string} imageFormat - 图片格式 (jpg, png, bmp)
 * @param {number} [imageWidth] - 可选宽度 (保持宽高比)
 * @param {number} [imageCompressionQuality=70] - 图片质量 (1-100)
 * @returns {Promise<string>} Base64编码的图像数据
 */
async function getSourceScreenshotByUuid(sourceUuid, imageFormat, imageWidth, imageCompressionQuality = 70) {
  try {
    const response = await plugin.obs.call('GetSourceScreenshot', {
      sourceUuid: sourceUuid,
      imageFormat: imageFormat,
      imageWidth: imageWidth,
      imageHeight: imageWidth,
      imageCompressionQuality: imageCompressionQuality
    });
    
    return response.imageData;
  } catch (error) {
    console.error(`获取源"${sourceUuid}"截图失败:`, error);
    throw error;
  }
}
/**
 * 绘制256x256图片并返回Base64
 * @param {string} bgColor - 背景色（CSS颜色值，如"#FFFFFF"）
 * @param {string} borderColor - 描边颜色（CSS颜色值）
 * @param {string} imageBase64 - 要嵌入的图片Base64数据
 * @param {number} [borderWidth=10] - 描边宽度（可选，默认10px）
 * @returns {Promise<string>} 绘制完成的图片Base64数据
 */
async function drawImageWithBorder(bgColor, borderColor, imageBase64, borderWidth = 20) {
    return new Promise((resolve, reject) => {
        // 创建画布
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // 绘制背景
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, 256, 256);
        
        // 绘制描边
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.strokeRect(
            borderWidth / 2, 
            borderWidth / 2, 
            256 - borderWidth, 
            256 - borderWidth
        );
        
        // 加载并绘制中心图片
        const img = new Image();
        img.onload = () => {
            try {
                // 计算图片位置（居中，保留边框空间）
                const padding = borderWidth * 2;
                const maxWidth = 256 - padding;
                const maxHeight = 256 - padding;
                
                // 计算保持比例的尺寸
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    const ratio = maxWidth / width;
                    width = maxWidth;
                    height = height * ratio;
                }
                
                if (height > maxHeight) {
                    const ratio = maxHeight / height;
                    height = maxHeight;
                    width = width * ratio;
                }
                
                // 居中绘制
                const x = (256 - width) / 2;
                const y = (256 - height) / 2;
                
                ctx.drawImage(img, x, y, width, height);
                
                // 转换为Base64
                resolve(canvas.toDataURL('image/png'));
            } catch (e) {
                reject(e);
            }
        };
        
        img.onerror = (e) => {
            reject(new Error('图片加载失败'));
        };
        
        img.src = imageBase64;
    });
}
async function  drawIcon(context: any) {
  const settings = plugin.getAction(context).settings as any;
  const result = await plugin.obs.call('GetCurrentProgramScene');
  let border = 0;
  // 是激活状态
  if(settings.scene === result.sceneUuid) {
    border = 20;
  }
  const imageData = await getSourceScreenshotByUuid(result.sceneUuid, 'png', 256, 70)
  let previewImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

  if(settings.image) {
    previewImage = settings.imageBase64;
  }

  if(settings.preview) {
    previewImage = imageData;
  }

  const bg = await drawImageWithBorder('black', settings.liveColor, previewImage, border)
  plugin.getAction(context).setImage((bg as any));
}
}
