<template>
  <div>
    <n-button @click="toggleRecording" type="primary">
      {{ isRecording ? 'Stop Recording' : 'Start Recording' }}
    </n-button>
    <n-image
      width="20"
      height="20"
      preview-disabled
      src="./images/deepseek/maikefeng.png"
    />
    <div v-if="audioUrl">
      <audio :src="audioUrl" controls></audio>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NButton, NImage } from 'naive-ui';

const isRecording = ref(false);
const mediaRecorder = ref<MediaRecorder | null>(null);
const chunks = ref<Blob[]>([]);
const audioUrl = ref('');

const toggleRecording = async () => {
  if (isRecording.value) {
    stopRecording();
  } else {
    await startRecording();
  }
};

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.value = new MediaRecorder(stream);

    mediaRecorder.value.ondataavailable = (event) => {
      chunks.value.push(event.data);
    };

    mediaRecorder.value.onstop = () => {
      const audioBlob = new Blob(chunks.value, { type: 'audio/wav' });
      audioUrl.value = URL.createObjectURL(audioBlob);
      chunks.value = [];
    };

    mediaRecorder.value.start();
    isRecording.value = true;
  } catch (err) {
    console.error("Error accessing microphone:", err);
  }
};

const stopRecording = () => {
  if (mediaRecorder.value) {
    mediaRecorder.value.stop();
    isRecording.value = false;
  }
};
</script>

<style scoped>
/* Add your styles here */
</style>



