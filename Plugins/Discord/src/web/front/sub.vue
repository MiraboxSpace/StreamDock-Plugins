<script setup lang="ts">
    import { Property } from "@mirabox/streamdock-sdk/property";
    const i18n = Property.getI18n();
    const property = Property.getReactiveInstance();
    // 在property上挂载任意函数或数据,给主窗口调用
    property.test1 = () => {
        console.log("test");
    };
    property.mainmessage = "子窗口已启动";
</script>

<template>
    <div class="main">
        <div>{{ i18n["模板文本"] }}</div>
        <div>{{ property.submessage }}</div>
        <!-- 子窗口父窗口数据同步的 -->
        <input v-model="property.settings.template" />
        <!-- property上任何数据都支持Vue响应式 -->
        <input v-model="property.mainmessage" />
        <div>子窗口获取当前窗口Id:{{ property.currentSubWindowId }}</div>
        <button @click="property.closeSubWindow(property.currentSubWindowId)">关闭任意子窗口,这里只关闭自己</button>
        <button @click="property.sendToPlugin({ test: 'test msg' })">发送Json消息给后端</button>
    </div>
</template>

<style scoped>
    .main {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
    }
</style>
