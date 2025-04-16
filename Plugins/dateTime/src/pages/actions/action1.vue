<script setup lang="ts">
import { usePropertyStore, useWatchEvent, TabView } from '@/hooks/property';
import { useI18nStore } from '@/hooks/i18n';

// 事件侦听器
const i18n = useI18nStore();
const property = usePropertyStore();
useWatchEvent({
  didReceiveSettings(data) { },
  sendToPropertyInspector(data) { }
});
</script>

<template>
  <TabView :label="i18n['选择'] + '：'">
    <div>
      <select v-model="property.settings.select">

        <option value="default">{{ i18n.DateAndTime }}</option>
        <option value="date_time_no_am">{{ i18n.DateAndTimeNoAM }}</option>
        <option value="date">{{ i18n.Date }}</option>
        <option value="date_no_year">{{ i18n.DateNoYear }}</option>
        <option value="time">{{ i18n.Time }}</option>
        <option value="time_24">{{ i18n.Time_24 }}</option>
        <option value="time_no_s">{{ i18n.TimeNoSeconds }}</option>
        <option value="time_no_s_24">{{ i18n.TimeNoSeconds24 }}</option>
        <option value="time_no_s_am">{{ i18n.TimeNoSecondsNoAMPM }}</option>

        <option value="week">{{ i18n.Week }}</option>
        <option value="day">{{ i18n.Day }}</option>
        <option value="month">{{ i18n.Month }}</option>
        <option value="month_name">{{ i18n.MonthName }}</option>
        <option value="month_sx">{{ i18n.MonthAbbreviation }}</option>
        <option value="year">{{ i18n.Year }}</option>

        <option value="h12">{{ i18n.Hour12 }}</option>
        <option value="h24">{{ i18n.Hour24 }}</option>
        <option value="m">{{ i18n.Minutes }}</option>
        <option value="s">{{ i18n.Seconds }}</option>
        <option value="am">{{ i18n.AMORPM }}</option>

        <option value="colon">{{ i18n.Colon }}</option>

      </select>
    </div>
  </TabView>

  <TabView :label="i18n.flash + '：'" v-if="property.settings.select === 'colon'">
    <select v-model="property.settings.flash">

      <option :value="false">{{ i18n.false }}</option>

      <option :value="true">{{ i18n.true }}</option>

    </select>
  </TabView>
</template>

<style lang="scss" scoped>
select {
  background-color: #3D3D3D;
  color: white;
  min-width: 200px;
  padding: 5px 2px;
  border: none;
  outline: none;
}
</style>
