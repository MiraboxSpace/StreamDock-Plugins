<!-- 请勿修改此文件 -->
<script setup lang="ts">
    import { defineAsyncComponent, Component } from "vue";
    import { Property } from "@mirabox/streamdock-sdk/property";
    const modules = import.meta.glob<{ default: Component }>("./front/*.vue");
    function loadComponent(name: string) {
        const path = `./front/${name}.vue`;
        const importer = modules[path];
        if (!importer) {
            throw new Error(`Component ${name} not found`);
        }
        return defineAsyncComponent(async () => {
            const module = await importer();
            return module.default;
        });
    }
    const PropertyInspector = loadComponent(Property.getCurrentActionName());
</script>

<template>
    <PropertyInspector></PropertyInspector>
</template>

<style>
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }
    html,
    body {
        min-height: 100vh;
        width: 100vw;
        color: #e6e6e6;
        overflow-x: hidden;
        overflow-y: auto;
        user-select: none;
        background-color: transparent !important;
        font-family: Arial, sans-serif;
    }
    body::-webkit-scrollbar {
        width: 8px;
    }
    body::-webkit-scrollbar-track {
        background: #23272a;
    }
    body::-webkit-scrollbar-thumb {
        background: #4f545c;
        border-radius: 4px;
    }
    body::-webkit-scrollbar-thumb:hover {
        background: #5f666f;
    }
    .panel {
        color: #dcddde;
        background: transparent;
    }
    .panel label {
        align-self: center;
        color: #dcddde;
        font-size: 13px;
    }
    .panel input,
    .panel select {
        min-height: 32px;
        padding: 5px 8px;
        border: 1px solid #40444b;
        border-radius: 4px;
        outline: none;
        background-color: #23272a !important;
        color: #f2f3f5 !important;
        color-scheme: dark;
    }
    input,
    select,
    textarea {
        background-color: #23272a !important;
        color: #f2f3f5 !important;
        border-color: #40444b;
        color-scheme: dark;
    }
    select option,
    select optgroup {
        background-color: #23272a !important;
        color: #f2f3f5 !important;
    }
    .panel input:focus,
    .panel select:focus {
        border-color: #7289da;
        box-shadow: 0 0 0 2px rgba(114, 137, 218, 0.22);
    }
    .panel button {
        min-height: 32px;
        padding: 0 12px;
        border: 1px solid #7289da;
        border-radius: 4px;
        background: #7289da;
        color: #fff;
        cursor: pointer;
        font-weight: 700;
    }
    .panel button:hover {
        border-color: #677bc4;
        background: #677bc4;
    }
</style>
