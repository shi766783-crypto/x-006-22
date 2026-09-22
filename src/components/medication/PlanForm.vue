<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useFamilyStore } from '../../stores/useFamilyStore'
import type { MedicationPlan } from '../../types'
import { isValidTime } from '../../utils/date'

const props = defineProps<{ plan?: MedicationPlan | null }>()
const emit = defineEmits<{
  (e: 'save', data: Omit<MedicationPlan, 'id'>): void
  (e: 'close'): void
}>()

const store = useFamilyStore()

const form = reactive({
  memberId: props.plan?.memberId ?? store.state.members[0]?.id ?? '',
  medicineId: props.plan?.medicineId ?? store.state.medicines[0]?.id ?? '',
  dosage: props.plan?.dosage ?? '',
  times: props.plan?.times?.length ? [...props.plan.times] : ['08:00'],
  startDate: props.plan?.startDate ?? '',
  endDate: props.plan?.endDate ?? '',
})

// Per-row validation, computed live so existing duplicates in an
// edited plan are flagged as soon as the form opens.
const timeErrors = computed(() => {
  const counts = new Map<string, number>()
  for (const t of form.times) {
    if (t) counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  return form.times.map((t) => {
    if (!t) return '请选择服药时间'
    if (!isValidTime(t)) return `「${t}」不是有效时间`
    if ((counts.get(t) ?? 0) > 1) return `时间点 ${t} 重复`
    return ''
  })
})

const hasTimeError = computed(() => timeErrors.value.some(Boolean))

function addTime() {
  form.times.push('12:00')
}

function removeTime(index: number) {
  if (form.times.length <= 1) return
  form.times.splice(index, 1)
}

function submit() {
  if (!form.memberId || !form.medicineId) return
  if (!form.times.length || hasTimeError.value) return
  emit('save', {
    memberId: form.memberId,
    medicineId: form.medicineId,
    dosage: form.dosage.trim(),
    times: [...form.times].sort(),
    startDate: form.startDate,
    endDate: form.endDate,
  })
}
</script>

<template>
  <div class="form-grid">
    <div class="form-group">
      <label class="form-label">家庭成员 *</label>
      <select v-model="form.memberId" class="input">
        <option v-for="m in store.state.members" :key="m.id" :value="m.id">{{ m.name }}</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">药品 *</label>
      <select v-model="form.medicineId" class="input">
        <option v-for="m in store.state.medicines" :key="m.id" :value="m.id">{{ m.name }}</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">每次剂量</label>
      <input v-model="form.dosage" class="input" placeholder="如：1粒 / 5ml" />
    </div>
    <div class="form-group">
      <label class="form-label">开始日期</label>
      <input v-model="form.startDate" type="date" class="input" />
    </div>
    <div class="form-group">
      <label class="form-label">结束日期</label>
      <input v-model="form.endDate" type="date" class="input" />
    </div>
    <div class="form-group span-2">
      <label class="form-label">每日服药时间 *</label>
      <div class="time-list">
        <div v-for="(time, i) in form.times" :key="time + i" class="time-row">
          <div class="time-field">
            <input
              v-model="form.times[i]"
              type="time"
              class="input"
              :class="{ 'input-error': timeErrors[i] }"
            />
            <p v-if="timeErrors[i]" class="field-error">{{ timeErrors[i] }}</p>
          </div>
          <button
            type="button"
            class="btn btn-sm btn-ghost"
            :disabled="form.times.length <= 1"
            title="至少保留一个时间点"
            @click="removeTime(i)"
          >
            移除
          </button>
        </div>
        <button type="button" class="btn btn-sm btn-ghost" @click="addTime">+ 添加时间点</button>
      </div>
    </div>
  </div>
  <div class="form-actions">
    <button type="button" class="btn btn-ghost" @click="emit('close')">取消</button>
    <button type="button" class="btn btn-primary" @click="submit">保存</button>
  </div>
</template>

<style scoped>
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}
.time-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.time-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.time-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.input-error {
  border-color: var(--danger-color);
}
.input-error:focus {
  border-color: var(--danger-color);
  box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.12);
}
.field-error {
  margin: 0;
  font-size: 12px;
  color: var(--danger-color);
}
</style>
