<template>
  <div class="card card--alarms">
    <div class="card__header">
      <div class="card__title">告警时间线</div>
      <div class="card__actions">
        <button class="chip" :class="{ 'chip--active': filter === 'all' }" @click="$emit('update:filter', 'all')">全部</button>
        <button class="chip" :class="{ 'chip--active': filter === 'alarm' }" @click="$emit('update:filter', 'alarm')">告警</button>
        <button class="chip" :class="{ 'chip--active': filter === 'warn' }" @click="$emit('update:filter', 'warn')">预警</button>
      </div>
    </div>
    <div class="alarms">
      <div
        v-for="e in list"
        :key="e.id"
        class="alarmItem"
        :class="e.level === 'alarm' ? 'alarmItem--alarm' : e.level === 'warn' ? 'alarmItem--warn' : 'alarmItem--ok'"
        @click="$emit('open', e)"
      >
        <div class="alarmItem__bar"></div>
        <div>
          <div class="alarmItem__title">{{ e.faultType }} · {{ prettyLevel(e.level) }}</div>
          <div class="alarmItem__meta">
            <span>{{ e.deviceId }}</span>
            <span>{{ toLocalTime(e.ts) }}</span>
          </div>
        </div>
      </div>
      <div v-if="!list.length" class="logLine">等待数据…</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { prettyLevel } from "../utils/level";
import { toLocalTime } from "../utils/time";

const props = defineProps({
  events: { type: Array, required: true },
  filter: { type: String, required: true },
});

defineEmits(["open", "update:filter"]);

const list = computed(() => {
  const f = props.filter;
  return props.events
    .filter((e) => {
      if (f === "alarm") return e.level === "alarm";
      if (f === "warn") return e.level === "warn";
      return true;
    })
    .slice(0, 30);
});
</script>

