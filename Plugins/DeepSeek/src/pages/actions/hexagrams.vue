<script setup lang="ts">
import { usePropertyStore, useWatchEvent, TabView, tabViewColumn } from '@/hooks/property';
import { useI18nStore } from '@/hooks/i18n';
import { NButton, NInput, useMessage } from 'naive-ui';
const i18n = useI18nStore();
const property = usePropertyStore();
const message = useMessage();

useWatchEvent({
    didReceiveSettings(data) {
        console.log(data)
    },
    sendToPropertyInspector(data) {
        console.log(data)
    }
});
// setInterval(() => {
// property.sendToPlugin({'world': 'hello'})
// },1000)
const openWindow = (url) => {
    if (url == 'guide') {
        property.sendToPlugin({ 'action': 'guide' })
    }
    if (url == 'open') {
        let valueFlag = true
        Object.keys(apiConfig).forEach(key => {
            console.log(apiConfig[key])
            if (apiConfig[key] == '') {
                valueFlag = false
                return
            }
        })
        console.log(valueFlag)
        if (valueFlag) {
            property.sendToPlugin({ 'action': 'open' })
        } else {
            message.warning(i18n['dataError'])
        }
    }
}
const apiConfig = reactive({ 'baseUrl': '', 'modelId': '', 'apiKey': '' })

watch(apiConfig, (newApiconfig) => {
    Object.keys(apiConfig).forEach(key => {
        property.settings[key] = newApiconfig[key]
    })
})
const init = () => {
    Object.keys(apiConfig).forEach(key => {
        console.log(property.settings[key])
        // 读取配置
        if (property.settings[key] && '' != property.settings[key]) {
            apiConfig[key] = property.settings[key]
        }
        // // 初始化配置
        // property.settings[key] = ''
        // property.settings[key] = apiConfig[key]
    })
}
onMounted(() => {
    init()
})
</script>

<template>
    <n-message-provider>
        <!-- <TabView :label="`测试`"><n-button @click="openWindow('open')">deepseek</n-button></TabView> -->
        <!-- <div @click="openWindow()">唤醒{{ temp }}</div> -->
        <a @click="openWindow('guide')" style="color: #177bff;cursor: pointer;">
            {{ i18n['API Parameter Retrieval Guide'] }}
        </a>
        <!-- <tabViewColumn><n-button @click="openWindow('guide')">{{ i18n['API Parameter Retrieval Guide'] }}</n-button></tabViewColumn> -->
        <tabViewColumn :label="i18n['baseUrl']"> <n-input type="text" :placeholder="i18n['baseUrl']"
                v-model:value="apiConfig.baseUrl" />
            <div class="info">{{ i18n['baseUrlInfo'] }}</div>
        </tabViewColumn>
        <tabViewColumn :label="i18n['modelId']"> <n-input type="text" :placeholder="i18n['modelId']"
                v-model:value="apiConfig.modelId" />
            <div class="info">{{ i18n['modelIdInfo'] }}</div>
        </tabViewColumn>
        <tabViewColumn :label="i18n['apiKey']">
            <n-input type="password" show-password-on="mousedown" :placeholder="i18n['apiKey']"
                v-model:value="apiConfig.apiKey" />
            <div class="info">{{ i18n['apiKeyInfo'] }}</div>
        </tabViewColumn>
        <div>
            <n-button @click="openWindow('open')" style="float: right;color: white" color="#0d6efd">
                保存并打开
            </n-button>
        </div>
    </n-message-provider>


</template>

<style lang="scss" scoped>
.info {
    margin-top: 4px;
}
</style>
