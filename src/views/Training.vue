<template>
  <div class="page">
    <!-- Hero / KPI -->
    <section class="hero card">
      <div>
        <h1>職涯訓練</h1>
        <p class="sub">Onboarding 與職涯成長課程，一站式完成。</p>
      </div>
      <div class="kpis">
        <div class="kpi">
          <div class="kpi-num">{{ summary.requiredAvg }}%</div>
          <div class="kpi-label">必修平均完成度</div>
        </div>
        <div class="kpi">
          <div class="kpi-num">{{ filtered.length }}</div>
          <div class="kpi-label">符合條件課程</div>
        </div>
      </div>
    </section>

        <!-- 推薦課程 -->
    <section class="card recommend">
    <h2>推薦課程</h2>
    <div class="rec-list">
        <div
        v-for="c in recommended"
        :key="c.id"
        class="rec-item"
        >
        <h3>{{ c.title }}</h3>
        <p class="desc">{{ c.description }}</p>
        <router-link :to="`/training/course/${c.id}`" class="btn small">
            前往學習
        </router-link>
        </div>
    </div>
    </section>

    <!-- 工具列 -->
    <section class="tools card">
      <div class="left">
        <input
          v-model="q"
          class="inp"
          placeholder="搜尋課程名稱、描述或 #標籤…"
        />
        <select v-model="filterRequired" class="inp">
          <option value="all">全部</option>
          <option value="required">只看必修</option>
          <option value="optional">只看選修</option>
        </select>
        <select v-model="sortBy" class="inp">
          <option value="progress_desc">排序：進度(高→低)</option>
          <option value="progress_asc">排序：進度(低→高)</option>
          <option value="duration_asc">排序：時數(短→長)</option>
          <option value="duration_desc">排序：時數(長→短)</option>
          <option value="title_asc">排序：名稱(A→Z)</option>
        </select>
      </div>
      <div class="right">
        <a
            href="https://share.google/qhhGSCZllmwBPCBfU"
            class="link"
            target="_blank"
            rel="noopener noreferrer"
            >
            常用縮寫
        </a>
      </div>
    </section>

    <!-- 類別 Tab -->
    <nav class="cats">
      <button
        class="cat"
        :class="{ active: activeCat === 'all' }"
        @click="activeCat = 'all'"
      >全部類別</button>

      <button
        v-for="c in categories"
        :key="c"
        class="cat"
        :class="{ active: activeCat === c }"
        @click="activeCat = c"
      >{{ c }}</button>
    </nav>

    <!-- 卡片列表 -->
    <section class="grid">
      <article
        v-for="c in paged"
        :key="c.id"
        class="card course"
      >
        <header class="card-hd">
          <h2 class="title">{{ c.title }}</h2>
          <span class="pill" :class="c.required ? 'red' : 'green'">
            {{ c.required ? '必修' : '選修' }}
          </span>
        </header>

        <p class="desc">{{ c.description }}</p>

        <div class="meta">
          <span>⏱️ {{ training.getCourseDurationMin(c) }} 分</span>
          <span>🏷️ {{ c.category }}</span>
          <span class="tags">
            <small v-for="t in c.tags" :key="t">#{{ t }}</small>
          </span>
        </div>

        <div class="bar">
          <div class="fill" :style="{ width: progressOf(c) + '%' }"></div>
        </div>
        <div class="progress-row">
          <span class="ptext">完成度：{{ progressOf(c) }}%</span>
          <span
            v-if="progressOf(c)===100"
            class="badge done"
            title="已完成"
          >✔ 完成</span>
        </div>

        <div class="actions">
          <router-link :to="`/training/course/${c.id}`" class="btn">
            {{ progressOf(c) > 0 && progressOf(c) < 100 ? '繼續學習' : '開始學習' }}
          </router-link>
        </div>
      </article>

      <!-- 空狀態 -->
      <div v-if="!paged.length" class="empty card">
        <div>找不到符合條件的課程，請調整搜尋或篩選條件。</div>
      </div>
    </section>

    <!-- 分頁 -->
    <section v-if="pages>1" class="pager">
      <button class="pg-btn" :disabled="page===1" @click="page--">上一頁</button>
      <span class="pg-info">{{ page }}/{{ pages }}</span>
      <button class="pg-btn" :disabled="page===pages" @click="page++">下一頁</button>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import training from '../router/training'

const router = useRouter()

const q = ref('')
const filterRequired = ref('all') // all | required | optional
const activeCat = ref('all')
const sortBy = ref('progress_desc') // progress_desc|progress_asc|duration_asc|duration_desc|title_asc

// 推薦邏輯：必修 + 進度未完成
const recommended = computed(() => {
  return training.state.courses
    .filter(c => c.required || training.courseProgress(c) < 100)
    .slice(0, 3) // 取前3筆
})

// 類別（從課程資料抽出）
const categories = Array.from(new Set(training.state.courses.map(c => c.category))).sort()

// 計算完成度 & 摘要
const summary = training.summary
const progressOf = (c) => training.courseProgress(c)

// 篩選
const filtered = computed(() => {
  const kw = q.value.trim().toLowerCase()

  return training.state.courses.filter(c => {
    const okReq =
      filterRequired.value === 'all' ||
      (filterRequired.value === 'required' && c.required) ||
      (filterRequired.value === 'optional' && !c.required)

    const okCat = activeCat.value === 'all' || c.category === activeCat.value

    const inKw = !kw ||
      c.title.toLowerCase().includes(kw) ||
      c.description.toLowerCase().includes(kw) ||
      (c.tags || []).some(t => t.toLowerCase().includes(kw))

    return okReq && okCat && inKw
  })
})

// 排序
const sorted = computed(() => {
  const list = [...filtered.value]
  switch (sortBy.value) {
    case 'progress_asc':
      return list.sort((a, b) => progressOf(a) - progressOf(b))
    case 'duration_asc':
      return list.sort((a, b) => a.durationMin - b.durationMin)
    case 'duration_desc':
      return list.sort((a, b) => b.durationMin - a.durationMin)
    case 'title_asc':
      return list.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hant'))
    case 'progress_desc':
    default:
      return list.sort((a, b) => progressOf(b) - progressOf(a))
  }
})

// 分頁（前端 slice）
const page = ref(1)
const pageSize = ref(6)
const pages = computed(() => Math.max(1, Math.ceil(sorted.value.length / pageSize.value)))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return sorted.value.slice(start, start + pageSize.value)
})

watch([q, filterRequired, activeCat, sortBy], () => { page.value = 1 })

// 初始化
onMounted(async () => {
  // 檢查登入狀態並載入進度
  const isLoggedIn = await training.checkAuthStatus()
  if (isLoggedIn) {
    await training.loadProgress()
  } else {
    // 如果未登入，重導向到登入頁面
    router.push('/login')
  }

  // 載入所有課程的實際影片時間長度
  try {
    await training.loadAllVideosDuration()
    console.log('所有課程影片時間長度載入完成')
  } catch (error) {
    console.warn('載入影片時間長度時發生錯誤:', error)
  }
})
</script>

<style scoped>
/* 版面 */
.page { padding: 20px; }

/* Hero / KPI */
.hero {
  display: flex; justify-content: space-between; align-items: center;
  gap: 16px; margin-bottom: 12px;
}
.hero h1 { margin: 0; color: var(--text); }
.sub { color: var(--text-light); margin: 4px 0 0; }
.kpis { display: flex; gap: 16px; }
.kpi { background: #f0f0f0; border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; min-width: 140px; text-align: center; }
.kpi-num { color: var(--primary); font-size: 22px; font-weight: 800; line-height: 1; }
.kpi-label { color: var(--text-light); font-size: 12px; margin-top: 4px; }

/* 推薦課程 */
.recommend { margin-bottom: 16px; }
.rec-list { display: flex; flex-wrap: wrap; gap: 16px; }
.rec-item {
  flex: 1 1 240px;
  background: #f9f9f9;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
}
.rec-item h3 { margin: 0; font-size: 16px; color: var(--text); }
.rec-item .desc { font-size: 13px; color: var(--text-light); margin: 4px 0 8px; }
.btn.small { font-size: 13px; padding: 6px 10px; }

/* 工具列 */
.tools {
  display: flex; justify-content: space-between; align-items: center;
  gap: 12px; margin-bottom: 8px;
}
.tools .left { display: flex; gap: 8px; flex-wrap: wrap; }
.inp {
  padding: 8px 10px; border: 1px solid var(--border); border-radius: 6px;
  background: #fff; min-width: 220px;
}
.link { color: var(--info); font-weight: 600; }

/* 類別 Tab */
.cats { display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0 12px; }
.cat {
  border: 1px solid var(--border); background: #fff; color: var(--text);
  padding: 6px 10px; border-radius: 999px; cursor: pointer; font-size: 14px;
}
.cat.active { background: var(--info); border-color: var(--info); color: #fff; }
.cat:hover { border-color: var(--info); color: var(--info); }
.cat.active:hover { color: #fff; }

/* 卡片列表 */
.grid {
  display: grid; gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}
.course .title { margin: 0; color: var(--text); }
.card-hd { display: flex; justify-content: space-between; align-items: center; }
.pill { padding: 2px 8px; border-radius: 999px; color: #fff; font-size: 12px; }
.pill.red { background: var(--info); }     /* 必修 = 藍 */
.pill.green { background: var(--success); } /* 選修 = 綠 */
.desc { color: var(--text-light); margin: 6px 0 10px; min-height: 40px; }
.meta { display: flex; gap: 12px; flex-wrap: wrap; font-size: 13px; color: #333; }
.tags small { background: #f1f1f1; padding: 2px 6px; border-radius: 6px; margin-left: 4px; }

/* 進度條 */
.bar { height: 8px; background: #eee; border-radius: 6px; overflow: hidden; margin-top: 10px; }
.fill { height: 100%; background: var(--info); transition: width .3s; }
.progress-row { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; }
.ptext { font-size: 13px; }
.badge.done {
  background: var(--success); color: #fff; font-size: 12px; border-radius: 6px; padding: 2px 8px;
}

/* 按鈕 */
.actions { margin-top: 10px; }
.btn { display: inline-block; text-decoration: none; background: var(--primary); color: #fff;
       padding: 8px 12px; border-radius: 6px; font-weight: 600; }
.btn:hover { background: var(--primary-dark); }

/* 分頁 */
.pager { display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 16px; }
.pg-btn { padding: 6px 12px; border: 1px solid var(--border); background: #fff; border-radius: 6px; cursor: pointer; }
.pg-btn:disabled { opacity: .5; cursor: not-allowed; }
.pg-info { color: var(--text-light); }

/* 空狀態 */
.empty { display: grid; place-items: center; color: var(--text-light); }

/* RWD */
@media (max-width: 768px) {
  .hero { flex-direction: column; align-items: flex-start; }
  .kpis { width: 100%; }
}
</style>