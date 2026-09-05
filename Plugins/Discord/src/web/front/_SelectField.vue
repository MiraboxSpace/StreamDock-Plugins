<script setup lang="ts">
defineProps<{
    label: string;
    options?: any[];
    value?: string;
}>();
const emit = defineEmits<{ change: [value: string] }>();
</script>

<template>
    <div class="row">
        <label>{{ label }}</label>
        <select :value="value" @change="emit('change', ($event.target as HTMLSelectElement).value)">
            <option v-for="item in options || []" :key="item.id || item.sound_id" :value="item.id || item.sound_id">
                {{ item.name || item.sound_name || item.username || item.global_name }}
            </option>
        </select>
    </div>
</template>

<style scoped>
.row {
    display: grid;
    grid-template-columns: 110px 1fr;
    align-items: center;
    gap: 8px;
}
select {
    min-height: 28px;
    background: #2c2f33;
    color: #dcddde;
    border: 1px solid #40444b;
    border-radius: 4px;
    padding: 4px 6px;
    outline: none;
}
select:focus {
    border-color: #7289da;
    box-shadow: 0 0 0 2px rgba(114, 137, 218, 0.22);
}
select option {
    background: #2c2f33;
    color: #dcddde;
}
</style>
