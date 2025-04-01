<template>
  <NConfigProvider :theme="darkTheme" :theme-overrides="Theme">
    <n-dialog-provider>
      <NMessageProvider>
        <RouterView></RouterView>
      </NMessageProvider>
    </n-dialog-provider>
  </NConfigProvider>
</template>
<script setup lang="ts">
import { NConfigProvider, darkTheme, GlobalThemeOverrides, NMessageProvider, NDialogProvider } from 'naive-ui';
import { useRouter } from 'vue-router'
const router = useRouter();
const Theme: GlobalThemeOverrides = {
  Select: {
    peers: {
      InternalSelection: {
        color: '#2D2D2D',
        borderRadius: '0px',
        heightMedium: '30px',
        boxShadowFocus: 'none',
        boxShadowActive: 'none',
        border: '1px solid #7a7a7a',
        borderHover: '1px solid #7a7a7a',
        borderFocus: '1px solid #7a7a7a'
      },
      InternalSelectMenu: {
        height: '140px'
      }
    }
  },
  Input: {
    color: '#2D2D2D',
    borderRadius: '8px',
    heightMedium: '30px',
    boxShadowFocus: 'none',
    border: '1px solid #7a7a7a',
    borderHover: '1px solid #7a7a7a',
    colorFocus: '#3d3d3d'
  },
  Checkbox: {
    boxShadowFocus: 'none'
  },
  List: {
    color: '#2d2d2d',
    colorHover: '#17171c'
  }
};
const changeFavicon = (src) => {
  document.title = 'DeepSeek'
  let link = document.querySelector("link[rel*='icon']") || document.createElement('link');
  link.type = 'image/x-icon';
  link.rel = 'shortcut icon';
  link.href = src;
  document.getElementsByTagName('head')[0].appendChild(link);

  console.log(document.title, src)
}

onMounted(() => {
  changeFavicon('./images/icon.png')
  router.push('/deepseekIndex')
})  
</script>