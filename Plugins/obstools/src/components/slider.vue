<template>
  <div class="flex flex-col items-center w-full">
    <div class="flex justify-between w-full mb-2 px-1">
      <span class="text-white-700 text-sm">{{ min }}</span>
      <span class="text-white-700 text-sm">{{ max }}</span>
    </div>
    <input
      type="range"
      class="form-range w-full h-6 p-0 bg-transparent focus:outline-none focus:ring-0 focus:shadow-none"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      @input="$emit('update:modelValue', Number($event.target.value))"
    />
    <div class="mt-2 text-white-700 text-lg">
      <span>{{ modelValue }}</span>
      <span v-if="unit" class="ml-1">{{ unit }}</span>
    </div>
  </div>
</template>

<script setup>

const props = defineProps({
  modelValue: {
    type: Number,
    default: 100,
  },
  min: {
    type: Number,
    default: 1,
  },
  max: {
    type: Number,
    default: 200,
  },
  step: {
    type: Number,
    default: 1,
  },
  unit: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue']);
</script>