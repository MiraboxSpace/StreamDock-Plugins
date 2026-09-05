<script setup lang="ts">
import { computed, ref } from "vue";
import AuthPanel from "./_AuthPanel.vue";
import { Property } from "@mirabox/streamdock-sdk/property";

const property = Property.getReactiveInstance();
const i18n = Property.getI18n();
const searchText = ref("");

interface SoundItem {
    sound_id: string;
    name: string;
    emoji_name?: string;
    guild_name?: string;
    guild_id?: string;
    [key: string]: unknown;
}

interface GroupedSounds {
    guildName: string;
    guildId: string;
    sounds: SoundItem[];
}

/** 将扁平声音数组按 guild 分组 */
function groupByGuild(sounds: SoundItem[]): GroupedSounds[] {
    const groups = new Map<string, GroupedSounds>();
    for (const s of sounds) {
        const gid = s.guild_id || "__unknown__";
        if (!groups.has(gid)) {
            groups.set(gid, {
                guildName: s.guild_name || "",
                guildId: gid,
                sounds: [],
            });
        }
        groups.get(gid)!.sounds.push(s);
    }
    return [...groups.values()].reverse();
}

const rawSounds = computed<SoundItem[]>(() => {
    const raw = property.settings.sounds;
    if (!raw) return [];
    // 兼容对象格式 { guildId: [...] }
    if (!Array.isArray(raw)) {
        const flat: SoundItem[] = [];
        for (const guildId of Object.keys(raw)) {
            for (const s of (raw as Record<string, SoundItem[]>)[guildId]) {
                flat.push(s);
            }
        }
        return flat;
    }
    return raw as SoundItem[];
});

const filteredGroups = computed<GroupedSounds[]>(() => {
    const q = searchText.value.trim().toLowerCase();
    const groups = groupByGuild(rawSounds.value);
    if (!q) return groups;
    return groups
        .map((g) => ({
            ...g,
            sounds: g.sounds.filter((s) => s.name.toLowerCase().includes(q)),
        }))
        .filter((g) => g.sounds.length > 0);
});

const selectedSoundId = computed({
    get: () => property.settings.sound_id,
    set: (val) => {
        const sound = rawSounds.value.find((s) => s.sound_id === val);
        property.settings.sound_id = val;
        property.settings.title = sound?.name || "";
        property.settings.emoji_name = sound?.emoji_name || "";
    },
});

function selectSound(sound: SoundItem) {
    selectedSoundId.value = sound.sound_id;
    property.settings.sound_id = sound.sound_id;
    property.settings.title = sound.name;
    property.settings.emoji_name = sound.emoji_name || "";
}

function refresh() {
    property.sendToPlugin({ refresh: true });
}
</script>

<template>
    <AuthPanel />
    <section class="panel">
        <div class="top-bar">
            <button @click="refresh">{{ i18n["刷新"] || "Refresh" }}</button>
            <input
                v-model="searchText"
                type="text"
                :placeholder="i18n['搜索'] || 'Search sounds...'"
            />
        </div>

        <div v-if="rawSounds.length === 0" class="empty">
            {{ i18n["点击刷新以获取声音列表"] || "Click refresh to load sounds" }}
        </div>

        <div v-for="group in filteredGroups" :key="group.guildId" class="guild-group">
            <div class="guild-title">{{ group.guildName }}</div>
            <div class="sound-grid">
                <button
                    v-for="sound in group.sounds"
                    :key="sound.sound_id"
                    class="sound-card"
                    :class="{ active: selectedSoundId === sound.sound_id }"
                    @click="selectSound(sound)"
                >
                    <span v-if="sound.emoji_name" class="emoji">{{ sound.emoji_name }}</span>
                    <span class="name">{{ sound.name }}</span>
                </button>
            </div>
        </div>
    </section>
</template>

<style scoped>
.panel {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 0 12px 12px;
    font:
        13px Arial,
        sans-serif;
    color: #f2f3f5;
}

/* ---- 顶部栏 ---- */
.top-bar {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
}

.top-bar button {
    min-height: 28px;
    padding: 0 12px;
    border: 1px solid #40444b;
    border-radius: 4px;
    background: #2c2f33;
    color: #fff;
    font-weight: 700;
    cursor: pointer;
    flex: 0 0 auto;
}
.top-bar button:hover {
    background: #343941;
}

.top-bar input {
    flex: 1 1 auto;
    min-height: 28px;
    padding: 0 8px;
    border: 1px solid #40444b;
    border-radius: 4px;
    background: #2c2f33;
    color: #f2f3f5;
    outline: none;
    min-width: 0;
}
.top-bar input::placeholder {
    color: #72767d;
}
.top-bar input:focus {
    border-color: #7289da;
}

/* ---- 空状态 ---- */
.empty {
    text-align: center;
    padding: 24px 0;
    color: #72767d;
    font-size: 13px;
}

/* ---- 公会分组 ---- */
.guild-group {
    margin-bottom: 12px;
}

.guild-title {
    font-weight: 700;
    font-size: 12px;
    color: #b9bbbe;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
    text-align: center;
}

/* ---- 声音卡片网格 ---- */
.sound-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
}

.sound-card {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 6px;
    padding: 8px 12px;
    border: 1px solid #40444b;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.2);
    color: #dcddde;
    cursor: pointer;
    font-size: 13px;
    transition:
        background 0.15s,
        border-color 0.15s;
    width: 100%;
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
}
.sound-card:hover {
    background: #3c3f46;
    border-color: #5865f2;
}
.sound-card.active {
    background: rgba(88, 101, 242, 0.25);
    border-color: #5865f2;
}

.emoji {
    flex: 0 0 auto;
    font-size: 16px;
}

.name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
