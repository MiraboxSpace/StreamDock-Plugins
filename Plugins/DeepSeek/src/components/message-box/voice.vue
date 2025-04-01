<template>
  <!-- 录音按钮 -->
  <!-- <n-image
    style="cursor: pointer;"
    width="20"
    height="20"
    preview-disabled
    src="./images/deepseek/maikefeng.png"
    @click="startRecording"
  /> -->
  <n-icon class="voice-icon" :component="KeyboardVoiceOutlined" @click="startRecording"></n-icon>
  <!-- 模态框组件 -->
  <n-modal v-model:show="showModal" :showIcon="false" preset="dialog" :title="i18n['recordingTitle']" @after-leave="modelClose">
    <!-- 录音时长显示 -->
    <p>{{ i18n['recordingTime'] }}: {{ recordingTime }} s</p>
    <!-- 波形图画布 -->
    <canvas ref="waveformCanvas" class="waveform"></canvas>
    <!-- 自定义模态框底部按钮 -->
    <template #action>
      <n-button type="primary" @click="handleComplete">{{ i18n['finish'] }}</n-button>
      <n-button @click="handleCancel">{{ i18n['cancel'] }}</n-button>
    </template>
  </n-modal>
  <!-- 加载弹窗 -->
  <n-modal v-model:show="isUploading" :showIcon="false" preset="dialog" :title="i18n['audioAnalysis']">
    <n-space justify="center">
      <n-spin size="large" />
    </n-space>
  </n-modal>
</template>

<script setup lang="ts">
import { NButton, NImage, NModal, NSpin, NSpace, useMessage, NIcon } from 'naive-ui';
import { KeyboardVoiceOutlined } from '@vicons/material'
import { ref, onMounted, nextTick } from 'vue';
import { ContextKey, RequestAiKey, MarkedKey, SetDataKey, GetDataKey, I18nKey, OpenUrlKey, EventStoreKey } from '@/hooks/injectionKeys';

const i18n = inject(I18nKey);
const eventStore = inject(EventStoreKey);
const message = useMessage()
// 显示模态框的状态
const showModal = ref(false);
// 录音时长
const recordingTime = ref(0);
let intervalId: number | null | NodeJS.Timeout = null;
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let audioUrl = ref<string | null>(null);
let audioDetails: any = ref(null);

// 加载状态
const isUploading = ref(false);

const modelClose = () => {
  console.log(intervalId)
  clearInterval(intervalId)
}

// 波形图画布引用
const waveformCanvas = ref<HTMLCanvasElement | null>(null);

// 组件挂载后初始化画布背景
onMounted(() => {
  nextTick(() => {
    if (waveformCanvas.value) {
      const canvasContext = waveformCanvas.value.getContext('2d');
      if (canvasContext) {
        canvasContext.fillStyle = '#ddd';
        canvasContext.fillRect(0, 0, waveformCanvas.value.width, waveformCanvas.value.height);
      }
    }
  });
});
// 监听设备按键 录制语音
eventStore.on('keyDown',() => {
  console.log('keyDown')
  startRecording()
})
eventStore.on('keyUp',() => {
  console.log('keyUp')
  handleComplete()
})
// 开始录音的方法
const startRecording = async () => {
  clearInterval(intervalId)
  try {
    // 获取麦克风权限
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    // 创建 AudioContext 和 AnalyserNode
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    // 设置增益，放大小声音
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 2; // 增益倍数可以根据需要调整
    // source.connect(analyser);
    source.connect(gainNode);
    gainNode.connect(analyser);
    // 设置 FFT 大小和数据数组
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // 绘制波形图的方法
    const drawWaveform = () => {
      requestAnimationFrame(drawWaveform);
      analyser.getByteTimeDomainData(dataArray);

      if (waveformCanvas.value) {
        const canvasContext = waveformCanvas.value.getContext('2d');
        if (canvasContext) {
          // 清除画布
          canvasContext.clearRect(0, 0, waveformCanvas.value.width, waveformCanvas.value.height);
          canvasContext.lineWidth = 2;
          canvasContext.strokeStyle = '#4caf50';

          // 计算每个切片的宽度
          const sliceWidth = waveformCanvas.value.width * 1.0 / bufferLength;
          let x = 0;

          // 开始绘制路径
          canvasContext.beginPath();

          for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * waveformCanvas.value.height / 2;

            if (i === 0) {
              canvasContext.moveTo(x, y);
            } else {
              canvasContext.lineTo(x, y);
            }

            x += sliceWidth;
          }

          // 结束路径并绘制
          canvasContext.lineTo(waveformCanvas.value.width, waveformCanvas.value.height / 2);
          canvasContext.stroke();
        }
      }
    };

    // 启动波形图绘制
    drawWaveform();

    // 监听 dataavailable 事件，收集音频数据
    mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    // 监听 stop 事件，处理录制完成后的逻辑
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      audioUrl.value = URL.createObjectURL(audioBlob);
      getAudioDetails(audioBlob).then(details => {
        audioDetails.value = details;
        if (shouldUpload.value) {
          uploadAudioFile(audioBlob); // 上传音频文件
        }
      }).catch(err => {
        console.error('无法获取音频详细信息:', err);
      });
      audioChunks = [];
    };

    // 显示模态框并启动计时器
    showModal.value = true;
    recordingTime.value = 0;
    intervalId = setInterval(() => {
      recordingTime.value++;
    }, 1000);
    mediaRecorder.start();
  } catch (err) {
    console.error('无法访问麦克风:', err);
    message.error(i18n['noAccessToMicrophone'])
  }
};

// 完成录音的方法
const shouldUpload = ref(true);
const handleComplete = () => {
  shouldUpload.value = true;
  stopRecording();
};

// 取消录音的方法
const handleCancel = () => {
  shouldUpload.value = false;
  stopRecording();
};

// 停止录音的方法
const stopRecording = () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
  clearInterval(intervalId!);
  console.log('录音结束:', recordingTime.value, '秒');
  showModal.value = false;
};

// 获取音频详细信息的方法
const getAudioDetails = (blob: Blob): Promise<any> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const audioContext = new AudioContext();
      audioContext.decodeAudioData(arrayBuffer, (buffer) => {
        resolve({
          name: 'recording.wav',
          size: blob.size,
          type: blob.type,
          duration: buffer.duration.toFixed(2)
        });
      }, reject);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
};

const setInputMessage = inject<(val: string) => void>('setInputMessage')
const uploadAudioFile = (audioBlob: Blob) => {
  isUploading.value = true;
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.wav');
  const url = 'http://workspace.featurize.cn:42796/api/v1/transcription/transcribe'
  // const url = 'http://localhost:3000/upload'
  fetch(url, {
    method: 'POST',
    headers: {
      'accept': 'application/json'
    },
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    console.log('上传成功:', data);
    message.success(i18n['audioAnalysisSuccess'])
    if(data.text != '') {
      setInputMessage(data.text)
    }
    isUploading.value = false;
  })
  .catch(error => {
    console.error('上传失败:', error);
    message.success(i18n['audioAnalysisError'])
    isUploading.value = false;
  });
};
</script>

<style scoped>
/* 添加一些样式以美化按钮和模态框 */
.n-button {
  margin-top: 2vmin;
}
.voice-icon {
  font-size: clamp(22px, 4vmin, 32px);
}
.waveform {
  width: 100%;
  height: 12vmax;
  background-color: #fff;
  border: 1px solid #ddd;
  margin-top: 2vh;
}
</style>



