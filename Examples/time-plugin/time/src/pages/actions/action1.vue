<script setup lang="ts">
  import { usePropertyStore, useWatchEvent, TabView } from '@/hooks/property';
  import { useI18nStore } from '@/hooks/i18n';
  import { NSelect,NRadioGroup, NRadio, NInput  } from 'naive-ui';

  // 事件侦听器
  const i18n = useI18nStore();
  const property = usePropertyStore();
  useWatchEvent({
    didReceiveSettings(data) {
    },
    sendToPropertyInspector(data) {}
  });

  // 选择时区
  const zones = [
    {
      label: i18n['跟随系统时区'],
      value: 'system'
    },
    {
      label: i18n['东一区: 德国、意大利'],
      value: '1'
    },
    {
      label: i18n['东二区: 土耳其、南非'],
      value: '2'
    },
    {
      label: i18n['东三区: 俄罗斯、莫斯科'],
      value: '3'
    },
    {
      label: i18n['东四区: 迪拜、路易港'],
      value: '4'
    },
    {
      label: i18n['东五区: 巴基斯坦、马尔代夫'],
      value: '5'
    },
    {
      label: i18n['东六区: 新西伯利亚、孟加拉国'],
      value: '6'
    },
    {
      label: i18n['东七区: 泰国、曼谷'],
      value: '7'
    },
    {
      label: i18n['东八区: 中国、新加坡'],
      value: '8'
    },
    {
      label: i18n['东九区: 日本、韩国'],
      value: '9'
    },
    {
      label: i18n['东十区: 悉尼、澳大利亚'],
      value: '10'
    },
    {
      label: i18n['东十一区: 所罗门群岛'],
      value: '11'
    },
    {
      label: i18n['东十二区: 新西兰'],
      value: '12'
    },
    {
      label: i18n['本初子午线: 格林威治'],
      value: '0'
    },
    {
      label: i18n['西一区: 亚速尔群岛'],
      value: '-1'
    },
    {
      label: i18n['西二区: 南乔治亚岛'],
      value: '-2'
    },
    {
      label: i18n['西三区: 巴西、阿根廷'],
      value: '-3'
    },
    {
      label: i18n['西四区: 玻利维亚'],
      value: '-4'
    },
    {
      label: i18n['西五区: 美国东部时间'],
      value: '-5'
    },
    {
      label: i18n['西六区: 美国中部时间'],
      value: '-6'
    },
    {
      label: i18n['西七区: 山地时间、丹佛'],
      value: '-7'
    },
    {
      label: i18n['西八区: 旧金山、洛杉矶'],
      value: '-8'
    },
    {
      label: i18n['西九区: 阿拉斯加'],
      value: '-9'
    },
    {
      label: i18n['西十区: 夏威夷'],
      value: '-10'
    },
    {
      label: i18n['西十一区: 纽埃岛'],
      value: '-11'
    },
    {
      label: i18n['西十二区: 太平洋'],
      value: '-12'
    }
  ];
  const themes = [
    {
      label: i18n['默认显示'],
      value: 'theme1'
    },
    {
      label: i18n['LED灯'],
      value: 'theme2'
    }
  ];
  const radios = [
    {
      value: '0',
      label: i18n['常规']
    },
    {
      value: '1',
      label: i18n['放大']
    },
    {
      value: '2',
      label: i18n['星期']
    }
  ];
</script>

<template>
  <TabView :label="i18n['标题']"><NInput v-model:value="property.settings.title"/></TabView>
  <TabView :label="i18n['选择时区']"><NSelect v-model:value="property.settings.zone" :options="zones" /></TabView>
  <TabView :label="i18n['选择主题']"><NSelect v-model:value="property.settings.theme" :options="themes" /></TabView>
  <TabView :label="i18n['显示方式']">
    <n-radio-group v-model:value="property.settings.select" name="radiogroup">
      <n-radio v-for="radio in radios" :key="radio.value" :value="radio.value">
        {{ radio.label }}
      </n-radio>
    </n-radio-group>
  </TabView>
</template>

<style lang="scss" scoped></style>
