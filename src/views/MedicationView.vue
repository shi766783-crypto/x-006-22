<script setup lang="ts">
import { computed, ref } from 'vue'
import DoseItem from '../components/medication/DoseItem.vue'
import PlanForm from '../components/medication/PlanForm.vue'
import BaseModal from '../components/ui/BaseModal.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import { useFamilyStore } from '../stores/useFamilyStore'
import type { MedicationPlan } from '../types'
import { formatDate } from '../utils/date'
import { formatPercent } from '../utils/format'
import { findPlanTimeIssues } from '../utils/planTime'

const store = useFamilyStore()
const showForm = ref(false)
const editing = ref<MedicationPlan | null>(null)

const todayDoses = computed(() => store.todayDoses)
const compliance = computed(() => store.compliance7)
const plans = computed(() => store.state.plans)

function memberName(plan: MedicationPlan) {
  return store.getMember(plan.memberId)?.name ?? '—'
}
function medicineName(plan: MedicationPlan) {
  return store.getMedicine(plan.medicineId)?.name ?? '—'
}

/** 已保存计划中残留的重复/非法时间问题（供列表提示和编辑入口） */
function planIssues(plan: MedicationPlan) {
  return findPlanTimeIssues(plan.times)
}

function openAdd() {
  editing.value = null
  showForm.value = true
}

function openEdit(plan: MedicationPlan) {
  editing.value = plan
  showForm.value = true
}

function onSave(data: Omit<MedicationPlan, 'id'>) {
  if (editing.value) store.updatePlan(editing.value.id, data)
  else store.addPlan(data)
  showForm.value = false
}

function onDelete(plan: MedicationPlan) {
  if (window.confirm('确定删除该用药计划吗？')) {
    store.deletePlan(plan.id)
  }
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h1 class="page-title">用药提醒</h1>
      <button type="button" class="btn btn-primary" @click="openAdd">＋ 新建用药计划</button>
    </div>

    <!-- Compliance -->
    <section class="card compliance-card">
      <div>
        <div class="compliance-value">{{ formatPercent(compliance.rate) }}</div>
        <div class="compliance-label">近 7 天用药依从率</div>
      </div>
      <div class="compliance-detail">
        <span>已服用 {{ compliance.taken }} 次</span>
        <span>已跳过 {{ compliance.skipped }} 次</span>
      </div>
    </section>

    <!-- Today's doses -->
    <section class="card">
      <div class="section-head">
        <h3>今日待服药</h3>
        <span class="muted">共 {{ todayDoses.length }} 项</span>
      </div>
      <template v-if="todayDoses.length">
        <DoseItem
          v-for="d in todayDoses"
          :key="d.planId + d.time"
          :dose="d"
          @mark="(s) => store.logDose(d.planId, d.time, s)"
        />
      </template>
      <EmptyState v-else icon="💤" text="今日暂无服药安排" />
    </section>

    <!-- Plans -->
    <section class="card">
      <div class="section-head">
        <h3>用药计划（{{ plans.length }}）</h3>
      </div>
      <template v-if="plans.length">
        <div v-for="p in plans" :key="p.id" class="plan-item">
          <div class="plan-info">
            <div class="plan-title-row">
              <span class="plan-title">{{ memberName(p) }} · {{ medicineName(p) }}</span>
              <span v-if="planIssues(p).length" class="issue-badge" title="时间点存在问题">
                ⚠️ 时间点需修正
              </span>
            </div>
            <div class="plan-meta">
              <span>剂量 {{ p.dosage || '—' }}</span>
              <span>时间 {{ p.times.join(' / ') }}</span>
              <span>{{ formatDate(p.startDate) }} ~ {{ formatDate(p.endDate) }}</span>
            </div>
            <ul v-if="planIssues(p).length" class="issue-list">
              <li v-for="(issue, idx) in planIssues(p)" :key="idx">⚠️ {{ issue.message }}</li>
            </ul>
          </div>
          <div class="plan-actions">
            <button
              type="button"
              class="btn btn-sm"
              :class="planIssues(p).length ? 'btn-danger' : 'btn-ghost'"
              @click="openEdit(p)"
            >
              编辑
            </button>
            <button type="button" class="btn btn-sm btn-danger-ghost" @click="onDelete(p)">删除</button>
          </div>
        </div>
      </template>
      <EmptyState v-else icon="📅" text="暂无用药计划" />
    </section>
  </div>

  <BaseModal v-if="showForm" :title="editing ? '编辑用药计划' : '新建用药计划'" @close="showForm = false">
    <PlanForm :plan="editing" @save="onSave" @close="showForm = false" />
  </BaseModal>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.page-title {
  margin: 0;
}
.compliance-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.compliance-value {
  font-size: 32px;
  font-weight: 800;
  color: var(--success-color);
}
.compliance-label {
  font-size: 13px;
  color: var(--text-secondary);
}
.compliance-detail {
  display: flex;
  gap: 16px;
  color: var(--text-secondary);
  font-size: 14px;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.section-head h3 {
  margin: 0;
}
.muted {
  color: var(--text-secondary);
  font-size: 13px;
}
.plan-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
}
.plan-item:last-child {
  border-bottom: none;
}
.plan-info {
  flex: 1;
}
.plan-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.plan-title {
  font-weight: 600;
  color: var(--text-primary);
}
.issue-badge {
  font-size: 12px;
  font-weight: 600;
  color: var(--danger-color);
  background: #fdecea;
  border-radius: 10px;
  padding: 2px 10px;
  white-space: nowrap;
}
.plan-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}
.issue-list {
  margin: 6px 0 0;
  padding-left: 18px;
  font-size: 12px;
  color: var(--danger-color);
}
.plan-actions {
  display: flex;
  gap: 8px;
  margin-left: 12px;
}
</style>
