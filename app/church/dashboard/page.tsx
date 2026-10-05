"use client"

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

// ============ ICONS (inline to avoid dependency issues) ============
const Icons = {
  Users: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  TrendingUp: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
  TrendingDown: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>,
  Heart: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
  Brain: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
  Home: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  DollarSign: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Church: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  HeartPulse: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>,
  ChevronRight: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>,
  ChevronLeft: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>,
  X: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  Lightbulb: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
  Sparkles: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
  Video: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
  Mic: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>,
  BookOpen: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  MessageCircle: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
  FileText: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  Play: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Compass: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>,
  Warning: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  Check: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  Target: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
};

// ============ CORE DATA ============

const ageGroups = ['Teen', 'University', 'Adult', 'Senior'];
const genders = ['Male', 'Female'];

// Church profile for this dashboard
const churchProfile = {
  name: "Grace Community Church",
  denomination: "Southern Baptist",
  size: "750 members",
  region: "Dallas-Fort Worth, TX",
  tier: "Weekly Sermon"
};

// Demographic totals for percentage calculations
const demographicTotals: Record<string, number> = {
  'All': 15873,
  'Teen': 2926,
  'University': 3692,
  'Adult': 5949,
  'Senior': 2544,
  'Male': 6973,
  'Female': 8900,
};

// Helper to calculate percentage
const calcPct = (count: number, demographic: string) => {
  const total = demographicTotals[demographic] || demographicTotals['All'];
  return Math.round((count / total) * 100);
};

const lifelines = {
  'Family & Relationships': { icon: 'Home', color: '#f43f5e', situations: ['Struggling with Family', 'Impact of Divorce', 'Relationship Conflicts', 'Wayward Loved Ones', 'Forgiving Someone', 'Difficulty Trusting Others'] },
  'Health & Loss': { icon: 'HeartPulse', color: '#10b981', situations: ['Physical Health Battles', 'Chronic Pain / Disability', 'Grieving a Loss', 'Infertility & Pregnancy Loss', 'Special Needs & Autism', 'Caring for Aging Parents'] },
  'Mental & Emotional': { icon: 'Brain', color: '#3b82f6', situations: ['Feeling Stressed', 'Anxiety & Worry', 'Depression & Low Mood', 'Burnout & Exhaustion', 'Anger & Frustration', 'Feeling Invisible'] },
  'Work & Finances': { icon: 'DollarSign', color: '#f59e0b', situations: ['Financial Issues', 'Workplace or School Tension', 'Career or Academic Uncertainty', 'Making a Hard Decision'] },
  'Faith & Purpose': { icon: 'Church', color: '#8b5cf6', situations: ['Continuing My Faith Journey', 'Questioning My Beliefs', 'Finding My Purpose', 'Feeling Far from God', 'Unanswered Prayer'] },
  'Self & Identity': { icon: 'Heart', color: '#06b6d4', situations: ['Doubting My Value', 'Body Image Struggles', 'Comparison & Envy', 'Dealing with Guilt & Shame'] },
  'Trials & Temptation': { icon: 'Compass', color: '#f97316', situations: ['Addiction Issues', 'Battling Temptation', 'Fear of the Future'] }
};

const getIcon = (name: string) => {
  const IconComponent = Icons[name as keyof typeof Icons];
  return IconComponent ? <IconComponent /> : <Icons.Heart />;
};

// Lifeline rankings by demographic - now with raw counts that we'll convert to %
const lifelineRankings: Record<string, Array<{name: string; category: string; count: number; trendPcts: number[]; change: string; rising: boolean}>> = {
  'All': [
    { name: 'Anxiety & Worry', category: 'Mental & Emotional', count: 3247, trendPcts: [18.2, 19.2, 20.5], change: '+2.3%', rising: true },
    { name: 'Relationship Conflicts', category: 'Family & Relationships', count: 2876, trendPcts: [16.7, 17.6, 18.1], change: '+1.4%', rising: true },
    { name: 'Feeling Far from God', category: 'Faith & Purpose', count: 2134, trendPcts: [14.1, 13.7, 13.4], change: '-0.7%', rising: false },
    { name: 'Grieving a Loss', category: 'Health & Loss', count: 1987, trendPcts: [11.8, 12.1, 12.5], change: '+0.7%', rising: true },
    { name: 'Financial Issues', category: 'Work & Finances', count: 1654, trendPcts: [7.8, 9.1, 10.4], change: '+2.6%', rising: true },
    { name: 'Depression & Low Mood', category: 'Mental & Emotional', count: 1543, trendPcts: [8.8, 9.2, 9.7], change: '+0.9%', rising: true },
    { name: 'Doubting My Value', category: 'Self & Identity', count: 1234, trendPcts: [7.5, 7.6, 7.8], change: '+0.3%', rising: true },
    { name: 'Burnout & Exhaustion', category: 'Mental & Emotional', count: 1198, trendPcts: [6.2, 6.9, 7.5], change: '+1.3%', rising: true },
  ],
  'Teen': [
    { name: 'Anxiety & Worry', category: 'Mental & Emotional', count: 892, trendPcts: [23.2, 27.0, 30.5], change: '+7.3%', rising: true },
    { name: 'Feeling Invisible', category: 'Mental & Emotional', count: 567, trendPcts: [14.8, 17.0, 19.4], change: '+4.6%', rising: true },
    { name: 'Questioning My Beliefs', category: 'Faith & Purpose', count: 445, trendPcts: [17.9, 16.3, 15.2], change: '-2.7%', rising: false },
    { name: 'Depression & Low Mood', category: 'Mental & Emotional', count: 423, trendPcts: [12.2, 13.3, 14.5], change: '+2.3%', rising: true },
    { name: 'Struggling with Family', category: 'Family & Relationships', count: 312, trendPcts: [9.8, 10.2, 10.7], change: '+0.9%', rising: true },
    { name: 'Burnout & Exhaustion', category: 'Mental & Emotional', count: 287, trendPcts: [7.2, 8.4, 9.8], change: '+2.6%', rising: true },
  ],
  'University': [
    { name: 'Anxiety & Worry', category: 'Mental & Emotional', count: 1123, trendPcts: [25.3, 28.0, 30.4], change: '+5.1%', rising: true },
    { name: 'Questioning My Beliefs', category: 'Faith & Purpose', count: 678, trendPcts: [19.3, 18.9, 18.4], change: '-0.9%', rising: false },
    { name: 'Career or Academic Uncertainty', category: 'Work & Finances', count: 534, trendPcts: [11.5, 12.9, 14.5], change: '+3.0%', rising: true },
    { name: 'Depression & Low Mood', category: 'Mental & Emotional', count: 489, trendPcts: [11.2, 12.1, 13.2], change: '+2.0%', rising: true },
    { name: 'Feeling Invisible', category: 'Mental & Emotional', count: 456, trendPcts: [10.2, 11.2, 12.3], change: '+2.1%', rising: true },
    { name: 'Finding My Purpose', category: 'Faith & Purpose', count: 412, trendPcts: [9.6, 10.5, 11.2], change: '+1.6%', rising: true },
  ],
  'Adult': [
    { name: 'Relationship Conflicts', category: 'Family & Relationships', count: 2089, trendPcts: [31.5, 33.2, 35.1], change: '+3.6%', rising: true },
    { name: 'Anxiety & Worry', category: 'Mental & Emotional', count: 987, trendPcts: [14.8, 15.7, 16.6], change: '+1.8%', rising: true },
    { name: 'Financial Issues', category: 'Work & Finances', count: 876, trendPcts: [10.8, 12.7, 14.7], change: '+3.9%', rising: true },
    { name: 'Burnout & Exhaustion', category: 'Mental & Emotional', count: 756, trendPcts: [10.3, 11.4, 12.7], change: '+2.4%', rising: true },
    { name: 'Wayward Loved Ones', category: 'Family & Relationships', count: 698, trendPcts: [11.0, 11.4, 11.7], change: '+0.7%', rising: true },
    { name: 'Caring for Aging Parents', category: 'Health & Loss', count: 543, trendPcts: [8.0, 8.6, 9.1], change: '+1.1%', rising: true },
  ],
  'Senior': [
    { name: 'Grieving a Loss', category: 'Health & Loss', count: 668, trendPcts: [24.5, 25.4, 26.3], change: '+1.8%', rising: true },
    { name: 'Chronic Pain / Disability', category: 'Health & Loss', count: 534, trendPcts: [19.6, 20.1, 21.0], change: '+1.4%', rising: true },
    { name: 'Feeling Far from God', category: 'Faith & Purpose', count: 423, trendPcts: [17.9, 17.5, 16.6], change: '-1.3%', rising: false },
    { name: 'Feeling Invisible', category: 'Mental & Emotional', count: 387, trendPcts: [12.3, 13.6, 15.2], change: '+2.9%', rising: true },
    { name: 'Struggling with Family', category: 'Family & Relationships', count: 298, trendPcts: [10.5, 10.9, 11.7], change: '+1.2%', rising: true },
    { name: 'Fear of the Future', category: 'Trials & Temptation', count: 234, trendPcts: [8.3, 8.8, 9.2], change: '+0.9%', rising: true },
  ],
  'Male': [
    { name: 'Anxiety & Worry', category: 'Mental & Emotional', count: 1234, trendPcts: [14.8, 16.3, 17.7], change: '+2.9%', rising: true },
    { name: 'Relationship Conflicts', category: 'Family & Relationships', count: 1198, trendPcts: [15.7, 16.4, 17.2], change: '+1.5%', rising: true },
    { name: 'Financial Issues', category: 'Work & Finances', count: 876, trendPcts: [9.2, 10.8, 12.6], change: '+3.4%', rising: true },
    { name: 'Questioning My Beliefs', category: 'Faith & Purpose', count: 654, trendPcts: [10.0, 9.7, 9.4], change: '-0.6%', rising: false },
    { name: 'Addiction Issues', category: 'Trials & Temptation', count: 534, trendPcts: [6.9, 7.1, 7.7], change: '+0.8%', rising: true },
    { name: 'Career or Academic Uncertainty', category: 'Work & Finances', count: 456, trendPcts: [5.6, 6.1, 6.5], change: '+0.9%', rising: true },
  ],
  'Female': [
    { name: 'Anxiety & Worry', category: 'Mental & Emotional', count: 2013, trendPcts: [19.7, 21.2, 22.6], change: '+2.9%', rising: true },
    { name: 'Relationship Conflicts', category: 'Family & Relationships', count: 1678, trendPcts: [17.2, 18.1, 18.9], change: '+1.7%', rising: true },
    { name: 'Burnout & Exhaustion', category: 'Mental & Emotional', count: 987, trendPcts: [8.5, 9.7, 11.1], change: '+2.6%', rising: true },
    { name: 'Grieving a Loss', category: 'Health & Loss', count: 876, trendPcts: [9.1, 9.5, 9.8], change: '+0.7%', rising: true },
    { name: 'Feeling Far from God', category: 'Faith & Purpose', count: 765, trendPcts: [9.2, 9.0, 8.6], change: '-0.6%', rising: false },
    { name: 'Caring for Aging Parents', category: 'Health & Loss', count: 654, trendPcts: [6.4, 6.9, 7.3], change: '+0.9%', rising: true },
  ]
};

// Detailed lifeline stats with AI guidance - ALL PERCENTAGES
const lifelineDetailData: Record<string, any> = {
  'Anxiety & Worry': {
    category: 'Mental & Emotional',
    pctOfCongregation: 20.5,
    monthlyTrend: [
      { month: 'Oct', pct: 18.2, newPct: 1.5, resolvedPct: 1.0 },
      { month: 'Nov', pct: 19.2, newPct: 1.8, resolvedPct: 0.8 },
      { month: 'Dec', pct: 20.5, newPct: 2.0, resolvedPct: 0.7 }
    ],
    byAge: { Teen: 30.5, University: 30.4, Adult: 16.6, Senior: 9.6 },
    byGender: { Male: 17.7, Female: 22.6 },
    topCorrelations: [
      { lifeline: 'Depression & Low Mood', overlap: 67 },
      { lifeline: 'Burnout & Exhaustion', overlap: 54 },
      { lifeline: 'Relationship Conflicts', overlap: 38 },
      { lifeline: 'Financial Issues', overlap: 32 }
    ],
    situations: [
      { name: 'General anxiety', pct: 9.2, trend: '+1.5%', rising: true },
      { name: 'Work/school anxiety', pct: 6.2, trend: '+1.8%', rising: true },
      { name: 'Social anxiety', pct: 3.4, trend: '+0.9%', rising: true },
      { name: 'Health anxiety', pct: 1.7, trend: '+0.4%', rising: true }
    ],
    contentGaps: [
      { topic: 'Anxiety at work', demandScore: 94, existingContent: 2 },
      { topic: 'Teen anxiety', demandScore: 88, existingContent: 3 },
      { topic: 'Panic attacks', demandScore: 85, existingContent: 1 },
      { topic: 'Anxiety and sleep', demandScore: 76, existingContent: 2 }
    ],
    insight: 'Anxiety affects 20.5% of your congregation - but 30.5% of your teens. That\'s 1 in 3 teenagers struggling. The teen rate jumped 7.3 percentage points in 3 months. 67% of anxious members also show signs of depression.',
    aiGuidance: [
      {
        type: 'sermon',
        title: 'Sermon Series Suggestion',
        description: 'Consider a 4-week series on "Peace in the Storm" addressing anxiety through Philippians 4:6-7. Teen attendance is up 23% when anxiety topics are covered.',
        priority: 'high',
        timing: 'January-February'
      },
      {
        type: 'small-group',
        title: 'Launch Anxiety Support Group',
        description: 'With 67% overlap between anxiety and depression, a combined support group could serve over 13% of your congregation. Tuesday evenings show highest engagement.',
        priority: 'high',
        timing: 'Next 30 days'
      },
      {
        type: 'content',
        title: 'Create "Anxiety at Work" Devotional',
        description: '6.2% of your congregation struggles with work/school anxiety, but you only have 2 pieces addressing this. A 7-day devotional could fill this gap.',
        priority: 'medium',
        timing: 'Next 2 weeks'
      }
    ]
  },
  'Relationship Conflicts': {
    category: 'Family & Relationships',
    pctOfCongregation: 18.1,
    monthlyTrend: [
      { month: 'Oct', pct: 16.7, newPct: 1.2, resolvedPct: 0.7 },
      { month: 'Nov', pct: 17.6, newPct: 1.3, resolvedPct: 0.5 },
      { month: 'Dec', pct: 18.1, newPct: 1.0, resolvedPct: 0.4 }
    ],
    byAge: { Teen: 0, University: 6.3, Adult: 35.1, Senior: 21.7 },
    byGender: { Male: 17.2, Female: 18.9 },
    topCorrelations: [
      { lifeline: 'Burnout & Exhaustion', overlap: 58 },
      { lifeline: 'Financial Issues', overlap: 45 },
      { lifeline: 'Wayward Loved Ones', overlap: 42 },
      { lifeline: 'Anxiety & Worry', overlap: 38 }
    ],
    situations: [
      { name: 'Communication breakdown', pct: 7.1, trend: '+0.8%', rising: true },
      { name: 'Emotional distance', pct: 5.5, trend: '+0.5%', rising: true },
      { name: 'After infidelity', pct: 2.9, trend: '+0.6%', rising: true },
      { name: 'Parenting conflicts', pct: 2.7, trend: '+0.3%', rising: true }
    ],
    contentGaps: [
      { topic: 'After infidelity', demandScore: 96, existingContent: 1 },
      { topic: 'Financial conflict in marriage', demandScore: 84, existingContent: 2 },
      { topic: 'Parenting disagreements', demandScore: 79, existingContent: 3 },
      { topic: 'Intimacy issues', demandScore: 74, existingContent: 2 }
    ],
    insight: '35.1% of your adults are in relationship conflict - over 1 in 3. "After infidelity" is growing fastest and you have almost no content for it. 58% of those in conflict also report exhaustion - they\'re burned out.',
    aiGuidance: [
      {
        type: 'counseling',
        title: 'Marriage Ministry Alert',
        description: '2.9% of your congregation is dealing with infidelity aftermath, up 0.6% in 3 months. Consider partnering with a licensed Christian counselor. This is beyond devotional content.',
        priority: 'critical',
        timing: 'Immediate'
      },
      {
        type: 'event',
        title: 'Marriage Retreat Opportunity',
        description: 'February is historically your lowest engagement month. A Valentine\'s weekend marriage retreat could serve couples while addressing the communication breakdown affecting 7.1%.',
        priority: 'high',
        timing: 'February 14-16'
      },
      {
        type: 'content',
        title: 'Create "Rebuilding Trust" Series',
        description: 'Demand score of 96% for infidelity content with only 1 existing piece. A sensitive, Scripture-based series could meet a critical need.',
        priority: 'high',
        timing: 'Next 3 weeks'
      }
    ]
  },
  'Financial Issues': {
    category: 'Work & Finances',
    pctOfCongregation: 10.4,
    monthlyTrend: [
      { month: 'Oct', pct: 7.8, newPct: 1.5, resolvedPct: 0.3 },
      { month: 'Nov', pct: 9.1, newPct: 1.7, resolvedPct: 0.4 },
      { month: 'Dec', pct: 10.4, newPct: 1.8, resolvedPct: 0.5 }
    ],
    byAge: { Teen: 1.5, University: 6.3, Adult: 14.7, Senior: 19.6 },
    byGender: { Male: 12.6, Female: 8.7 },
    topCorrelations: [
      { lifeline: 'Anxiety & Worry', overlap: 62 },
      { lifeline: 'Relationship Conflicts', overlap: 48 },
      { lifeline: 'Depression & Low Mood', overlap: 41 },
      { lifeline: 'Burnout & Exhaustion', overlap: 38 }
    ],
    situations: [
      { name: 'Debt overwhelming', pct: 4.3, trend: '+1.2%', rising: true },
      { name: 'Job loss impact', pct: 2.9, trend: '+1.1%', rising: true },
      { name: 'Medical bills', pct: 2.0, trend: '+0.6%', rising: true },
      { name: 'Retirement fears', pct: 1.3, trend: '+0.3%', rising: true }
    ],
    contentGaps: [
      { topic: 'Biblical view of debt', demandScore: 91, existingContent: 2 },
      { topic: 'Financial stress on marriage', demandScore: 86, existingContent: 1 },
      { topic: 'Trusting God in job loss', demandScore: 82, existingContent: 3 },
      { topic: 'Generosity when broke', demandScore: 68, existingContent: 1 }
    ],
    insight: 'Financial crisis jumped from 7.8% to 10.4% in 3 months - your fastest-rising lifeline. 1 in 5 seniors (19.6%) and nearly 1 in 7 adults (14.7%) are struggling. Men are hit harder (12.6% vs 8.7% women).',
    aiGuidance: [
      {
        type: 'resource',
        title: 'Partner with Financial Peace',
        description: '4.3% of your congregation is overwhelmed by debt. Consider hosting a Dave Ramsey Financial Peace University class. This addresses a felt need while building community.',
        priority: 'high',
        timing: 'Q1 2026'
      },
      {
        type: 'sermon',
        title: 'Sermon on Generosity in Scarcity',
        description: 'Counter-intuitive, but giving is actually up 12% among those in financial stress. A sermon on the widow\'s mite could encourage faith-based giving.',
        priority: 'medium',
        timing: 'Stewardship month'
      },
      {
        type: 'pastoral',
        title: 'Benevolence Fund Review',
        description: 'With 2.9% experiencing job loss impact, review your benevolence fund criteria. Consider creating a "bridge fund" for active members facing temporary hardship.',
        priority: 'high',
        timing: 'Elder meeting'
      }
    ]
  },
};

// Comparison benchmark data - already in percentages
const benchmarkData = {
  similarSize: {
    label: 'Similar Size Churches',
    description: '500-1,000 members',
    count: 127,
    data: {
      'Anxiety & Worry': { avg: 18, yourChurch: 20.5, status: 'above' },
      'Relationship Conflicts': { avg: 21, yourChurch: 18.1, status: 'below' },
      'Financial Issues': { avg: 8, yourChurch: 10.4, status: 'concern' },
      'Depression & Low Mood': { avg: 10, yourChurch: 9.7, status: 'normal' },
      'Grieving a Loss': { avg: 13, yourChurch: 12.5, status: 'normal' },
      'Questioning My Beliefs': { avg: 8, yourChurch: 14, status: 'concern' },
      'Addiction Issues': { avg: 6, yourChurch: 5, status: 'normal' },
    }
  },
  denomination: {
    label: 'Southern Baptist Churches',
    description: 'All SBC churches on platform',
    count: 312,
    data: {
      'Anxiety & Worry': { avg: 17, yourChurch: 20.5, status: 'above' },
      'Relationship Conflicts': { avg: 23, yourChurch: 18.1, status: 'below' },
      'Financial Issues': { avg: 9, yourChurch: 10.4, status: 'above' },
      'Depression & Low Mood': { avg: 9, yourChurch: 9.7, status: 'normal' },
      'Grieving a Loss': { avg: 14, yourChurch: 12.5, status: 'below' },
      'Questioning My Beliefs': { avg: 6, yourChurch: 14, status: 'concern' },
      'Addiction Issues': { avg: 7, yourChurch: 5, status: 'below' },
    }
  },
  regional: {
    label: 'DFW Metro Churches',
    description: 'Dallas-Fort Worth area',
    count: 48,
    data: {
      'Anxiety & Worry': { avg: 19, yourChurch: 20.5, status: 'normal' },
      'Relationship Conflicts': { avg: 20, yourChurch: 18.1, status: 'normal' },
      'Financial Issues': { avg: 11, yourChurch: 10.4, status: 'normal' },
      'Depression & Low Mood': { avg: 11, yourChurch: 9.7, status: 'below' },
      'Grieving a Loss': { avg: 12, yourChurch: 12.5, status: 'normal' },
      'Questioning My Beliefs': { avg: 9, yourChurch: 14, status: 'concern' },
      'Addiction Issues': { avg: 8, yourChurch: 5, status: 'below' },
    }
  }
};

// Pastoral Guidance - integrated with TrueTeachings sermon library
const pastoralGuidance = [
  { 
    id: 1, 
    priority: 'Critical', 
    lifeline: 'Anxiety & Worry',
    title: 'Anxiety at Work & School', 
    description: 'Work/school anxiety affects 6.2% of your congregation, up 1.8 pts in 3 months. 30.5% of your teens are struggling.',
    audience: 'University & Adult',
    impact: '6.2% of congregation',
    color: '#ef4444',
    pastSermons: [
      { title: 'Peace in the Storm', date: 'Mar 12, 2025', verse: 'Phil 4:6-7', relevance: 92 },
      { title: 'When Worry Takes Over', date: 'Nov 3, 2024', verse: 'Matt 6:25-34', relevance: 88 },
      { title: 'Faith Over Fear', date: 'Jun 18, 2024', verse: 'Isaiah 41:10', relevance: 76 },
    ],
    scriptureConnections: [
      { verse: '1 Peter 5:7', text: 'Cast all your anxiety on him because he cares for you.' },
      { verse: 'Psalm 94:19', text: 'When anxiety was great within me, your consolation brought me joy.' },
      { verse: 'Proverbs 12:25', text: 'Anxiety weighs down the heart, but a kind word cheers it up.' },
    ],
    sermonAngles: [
      'Revisit "Peace in the Storm" with specific workplace applications',
      'Share a personal story about workplace pressure and how Scripture anchored you',
      'Practical segment: breathing prayer technique using Philippians 4:6-7',
    ],
    smallGroupQuestions: [
      'What triggers your anxiety most at work or school?',
      'How do you currently cope? What helps, what doesnt?',
      'What would it look like to cast your anxiety on God in a Monday morning meeting?',
    ]
  },
  { 
    id: 2, 
    priority: 'Critical', 
    lifeline: 'Relationship Conflicts',
    title: 'Marriage After Infidelity', 
    description: '2.9% dealing with infidelity aftermath, up 0.6 pts in 3 months. Almost no content addressing this.',
    audience: 'Adult - Marriage',
    impact: '~3% of congregation',
    color: '#ef4444',
    pastSermons: [
      { title: 'The Forgiving Heart', date: 'Sep 22, 2024', verse: 'Col 3:13', relevance: 84 },
      { title: 'Rebuilding Trust', date: 'Feb 14, 2024', verse: 'Prov 3:5-6', relevance: 78 },
      { title: 'When Love is Hard', date: 'Aug 6, 2023', verse: '1 Cor 13:4-7', relevance: 71 },
    ],
    scriptureConnections: [
      { verse: 'Hosea 3:1', text: 'Go, show your love to your wife again, though she is loved by another...' },
      { verse: 'Matthew 19:6', text: 'What God has joined together, let no one separate.' },
      { verse: 'Ephesians 4:32', text: 'Be kind to one another, tenderhearted, forgiving one another...' },
    ],
    sermonAngles: [
      'Use Hosea and Gomer as a model - emphasize Gods redemptive love, not condemnation',
      'Address both the betrayed AND the betrayer with grace - many carry this shame silently',
      'Recommend professional Christian counseling - this is beyond a devotional',
    ],
    smallGroupQuestions: [
      'Note: This topic may need a specialized support group rather than open discussion',
      'Consider partnering with a licensed Christian counselor for a facilitated group',
      'If addressing generally: How does Gods forgiveness of us inform how we forgive others?',
    ]
  },
  { 
    id: 3, 
    priority: 'Critical', 
    lifeline: 'Financial Issues',
    title: 'Financial Crisis & Faith', 
    description: 'Fastest-rising lifeline: up 2.6 pts in 3 months. Now affects 10.4% overall, 14.7% of adults, 19.6% of seniors.',
    audience: 'All Ages',
    impact: '1 in 10 members',
    color: '#ef4444',
    pastSermons: [
      { title: 'Generosity in Scarcity', date: 'Nov 17, 2024', verse: 'Mark 12:41-44', relevance: 89 },
      { title: 'God Will Provide', date: 'Apr 7, 2024', verse: 'Phil 4:19', relevance: 85 },
      { title: 'Money and the Kingdom', date: 'Jan 14, 2024', verse: 'Matt 6:19-21', relevance: 79 },
    ],
    scriptureConnections: [
      { verse: 'Philippians 4:19', text: 'My God will meet all your needs according to the riches of his glory.' },
      { verse: 'Proverbs 22:7', text: 'The borrower is slave to the lender.' },
      { verse: 'Matthew 6:33', text: 'Seek first his kingdom... and all these things will be given to you.' },
    ],
    sermonAngles: [
      'Revisit "Generosity in Scarcity" - the widows mite is counter-intuitive but powerful',
      'Be real about struggle - dont just quote God will provide to people losing their homes',
      'Practical help: announce benevolence fund, partner with Financial Peace University',
    ],
    smallGroupQuestions: [
      'Whats the difference between worry about money and wise planning?',
      'How do we hold seek first the kingdom and pay your bills together?',
      'What practical support can our group offer each other?',
    ]
  },
  { 
    id: 4, 
    priority: 'High', 
    lifeline: 'Grieving a Loss',
    title: 'Grief During the Holidays', 
    description: 'Grief affects 26.3% of seniors - 1 in 4. Holiday season intensifies loss.',
    audience: 'All Ages - Seniors',
    impact: '1 in 4 seniors',
    color: '#f59e0b',
    pastSermons: [
      { title: 'Comfort for the Brokenhearted', date: 'May 5, 2024', verse: 'Psalm 34:18', relevance: 94 },
      { title: 'Hope Beyond the Grave', date: 'Apr 9, 2023', verse: '1 Thess 4:13-14', relevance: 87 },
      { title: 'When God Feels Distant', date: 'Oct 8, 2023', verse: 'Psalm 22:1-2', relevance: 72 },
    ],
    scriptureConnections: [
      { verse: 'Psalm 34:18', text: 'The Lord is close to the brokenhearted and saves those crushed in spirit.' },
      { verse: 'Revelation 21:4', text: 'He will wipe every tear from their eyes. No more death or mourning.' },
      { verse: 'John 11:35', text: 'Jesus wept.' },
    ],
    sermonAngles: [
      'Pre-holiday message: acknowledge the empty chair, give permission to feel',
      'Revisit "Comfort for the Brokenhearted" with holiday-specific applications',
      'Share resources: Blue Christmas service, GriefShare, pastoral care availability',
    ],
    smallGroupQuestions: [
      'Whats the hardest part of holidays after loss?',
      'How can we honor our loved ones memory while still finding moments of joy?',
      'What practical support would help you through this season?',
    ]
  },
  { 
    id: 5, 
    priority: 'High', 
    lifeline: 'Feeling Invisible',
    title: 'Teen Loneliness & Belonging', 
    description: '19.4% of teens feel invisible - nearly 1 in 5. Up 4.6 pts in 3 months. Post-COVID isolation is real.',
    audience: 'Teen',
    impact: '1 in 5 teens',
    color: '#f59e0b',
    pastSermons: [
      { title: 'You Are Seen', date: 'Aug 11, 2024', verse: 'Gen 16:13', relevance: 91 },
      { title: 'Finding Your Tribe', date: 'Jan 21, 2024', verse: 'Eccl 4:9-12', relevance: 83 },
      { title: 'Identity in Christ', date: 'May 19, 2024', verse: 'Eph 2:10', relevance: 77 },
    ],
    scriptureConnections: [
      { verse: 'Genesis 16:13', text: 'She gave this name to the Lord: You are the God who sees me.' },
      { verse: 'Psalm 139:1-4', text: 'You have searched me, Lord, and you know me.' },
      { verse: 'Isaiah 43:1', text: 'I have called you by name; you are mine.' },
    ],
    sermonAngles: [
      'Hagars story (The God Who Sees Me) resonates with teens feeling overlooked',
      'Challenge youth leaders: are we creating cliques or community? Be honest.',
      'Practical: small group restructuring, intentional connection beyond Sunday',
    ],
    smallGroupQuestions: [
      'When do you feel most invisible? Most seen?',
      'What makes it hard to connect with people your age?',
      'If you knew God really saw everything about you, how would that change things?',
    ]
  },
  { 
    id: 6, 
    priority: 'High', 
    lifeline: 'Burnout & Exhaustion',
    title: 'Rest as Spiritual Discipline', 
    description: 'Burnout affects 11.1% of women - 1 in 9. Up 2.6 pts among women in 3 months.',
    audience: 'Adult - Women',
    impact: '1 in 9 women',
    color: '#f59e0b',
    pastSermons: [
      { title: 'The Gift of Sabbath', date: 'Jul 14, 2024', verse: 'Ex 20:8-11', relevance: 93 },
      { title: 'Come to Me, Weary Ones', date: 'Sep 8, 2024', verse: 'Matt 11:28-30', relevance: 90 },
      { title: 'Elijahs Burnout', date: 'Mar 3, 2024', verse: '1 Kings 19:1-8', relevance: 86 },
    ],
    scriptureConnections: [
      { verse: 'Matthew 11:28-30', text: 'Come to me, all you who are weary, and I will give you rest.' },
      { verse: 'Psalm 23:2-3', text: 'He makes me lie down in green pastures... he refreshes my soul.' },
      { verse: 'Exodus 33:14', text: 'My Presence will go with you, and I will give you rest.' },
    ],
    sermonAngles: [
      'Elijahs story is powerful - even prophets burn out. Gods response: sleep, food, presence.',
      'Challenge the busy as a badge of honor culture directly',
      'Womens ministry: many carry invisible loads (caregiving, emotional labor). See and name this.',
    ],
    smallGroupQuestions: [
      'What makes rest feel guilty or impossible for you?',
      'Whats the difference between being lazy and honoring Sabbath?',
      'What would change if you treated rest as obedience rather than indulgence?',
    ]
  },
];

// ============ COMPONENTS ============

const FilterPill = ({ label, selected, onClick, pct }: { label: string; selected: boolean; onClick: () => void; pct?: number }) => (
  <button onClick={onClick} className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${selected ? 'bg-amber-500 text-gray-900 shadow-lg' : 'bg-white/10 text-white border border-white/20 hover:border-white/40'}`}>
    {label}
    {pct !== undefined && <span className={`text-xs px-1.5 py-0.5 rounded-full ${selected ? 'bg-black/20' : 'bg-white/10'}`}>{pct}%</span>}
  </button>
);

const TrendBadge = ({ change, rising }: { change: string; rising: boolean }) => (
  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${rising ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
    {rising ? <Icons.TrendingUp /> : <Icons.TrendingDown />}
    {change}
  </span>
);

const MiniSparkline = ({ data, rising }: { data: number[]; rising: boolean }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${i * 30},${40 - ((v - min) / range) * 35}`).join(' ');
  
  return (
    <svg width="60" height="40" className="flex-shrink-0">
      <polyline fill="none" stroke={rising ? '#ef4444' : '#10b981'} strokeWidth="2" points={points} />
      {data.map((v, i) => (
        <circle key={i} cx={i * 30} cy={40 - ((v - min) / range) * 35} r="3" fill={rising ? '#ef4444' : '#10b981'} />
      ))}
    </svg>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    'concern': 'bg-red-500/20 text-red-300 border-red-500/30',
    'above': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'normal': 'bg-green-500/20 text-green-300 border-green-500/30',
    'below': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  };
  const labels: Record<string, string> = {
    'concern': 'ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Needs Attention',
    'above': 'ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬Ëœ Above Average',
    'normal': 'ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ Normal Range',
    'below': 'ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬Å“ Below Average',
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

// Ranking row now shows PERCENTAGE as the primary metric
const LifelineRankingRow = ({ rank, item, demographic, onClick }: { rank: number; item: any; demographic: string; onClick: () => void }) => {
  const categoryInfo = Object.entries(lifelines).find(([key]) => key === item.category)?.[1];
  const color = categoryInfo?.color || '#6366f1';
  const pct = item.trendPcts[2]; // Current percentage

  return (
    <button 
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 md:gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-amber-400/50 hover:bg-white/10 active:bg-white/20 active:border-amber-400 transition-all cursor-pointer group text-left touch-manipulation select-none"
      style={{ WebkitTapHighlightColor: 'rgba(251, 191, 36, 0.3)' }}
    >
      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
        {rank}
      </div>
      <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: `${color}30` }}>
        <span style={{ color }}>{getIcon(categoryInfo?.icon || 'Heart')}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white group-hover:text-amber-300 group-active:text-amber-300 transition-colors truncate">{item.name}</p>
        <p className="text-xs text-blue-200/60 truncate">{item.category}</p>
      </div>
      <div className="hidden sm:block flex-shrink-0">
        <MiniSparkline data={item.trendPcts} rising={item.rising} />
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-bold text-white text-lg md:text-xl">{pct}%</p>
        <TrendBadge change={item.change} rising={item.rising} />
      </div>
      <span className="text-amber-400 flex-shrink-0">
        <Icons.ChevronRight />
      </span>
    </button>
  );
};

// Enhanced Detail Panel - ALL PERCENTAGES
const LifelineDetailPanel = ({ lifeline, onClose }: { lifeline: string; onClose: () => void }) => {
  const data = lifelineDetailData[lifeline];
  const [activeSection, setActiveSection] = useState<string>('overview');
  
  if (!data) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-end">
        <div className="w-full max-w-2xl h-full bg-[#0f2137] overflow-y-auto shadow-2xl border-l border-white/10">
          <div className="sticky top-0 bg-[#0f2137] border-b border-white/10 p-6 flex items-center justify-between z-10">
            <h2 className="text-2xl font-bold text-white">{lifeline}</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white">
              <Icons.X />
            </button>
          </div>
          <div className="p-6">
            <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-6 text-center">
              <p className="text-white font-semibold mb-2">Detailed Analytics Coming Soon</p>
              <p className="text-blue-200/70 text-sm">We're building deeper insights for this lifeline.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const categoryInfo = Object.entries(lifelines).find(([key]) => key === data.category)?.[1];
  const color = categoryInfo?.color || '#6366f1';

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-end" onClick={onClose}>
      <div className="w-full max-w-3xl h-full bg-[#0f2137] overflow-y-auto shadow-2xl border-l border-white/10" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-[#0f2137] border-b border-white/10 p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl" style={{ backgroundColor: `${color}30` }}>
                <span style={{ color }}>{getIcon(categoryInfo?.icon || 'Heart')}</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{lifeline}</h2>
                <p className="text-blue-200/60">{data.category} ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ <span className="text-white font-semibold">{data.pctOfCongregation}%</span> of congregation</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white">
              <Icons.X />
            </button>
          </div>
          
          {/* Section Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'demographics', label: 'Demographics' },
              { id: 'ai-guidance', label: 'AI Guidance' },
              { id: 'content-gaps', label: 'Content Gaps' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeSection === tab.id 
                    ? 'bg-amber-500 text-gray-900' 
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Key Insight */}
          <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl p-5 border border-amber-400/30">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-amber-400"><Icons.Lightbulb /></span>
              <span className="font-semibold text-amber-400">Key Insight</span>
            </div>
            <p className="text-white/90 leading-relaxed">{data.insight}</p>
          </div>

          {activeSection === 'overview' && (
            <>
              {/* 3-Month Trend */}
              <div>
                <h3 className="font-bold text-white mb-4">3-Month Trend</h3>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={data.monthlyTrend}>
                      <defs>
                        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={color} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} domain={[0, 'dataMax + 5']} tickFormatter={(v) => `${v}%`} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} formatter={(value: any) => [`${value}%`, 'Rate']} />
                      <Area type="monotone" dataKey="pct" stroke={color} strokeWidth={3} fill="url(#trendGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                    {data.monthlyTrend.map((m: any, i: number) => (
                      <div key={i} className="bg-white/5 rounded-lg p-3">
                        <p className="text-xs text-blue-200/50">{m.month}</p>
                        <p className="font-bold text-white text-lg">{m.pct}%</p>
                        <div className="flex justify-center gap-3 mt-1">
                          <span className="text-xs text-emerald-400">+{m.newPct}% new</span>
                          <span className="text-xs text-blue-400">{m.resolvedPct}% resolved</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Correlated Lifelines */}
              <div>
                <h3 className="font-bold text-white mb-4">Members Also Struggling With</h3>
                <div className="grid grid-cols-2 gap-3">
                  {data.topCorrelations.map((corr: any, i: number) => (
                    <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-white">{corr.lifeline}</span>
                        <span className="text-xs font-bold text-indigo-400">{corr.overlap}% overlap</span>
                      </div>
                      <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${corr.overlap}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sub-situations */}
              <div>
                <h3 className="font-bold text-white mb-4">Specific Situations</h3>
                <div className="space-y-2">
                  {data.situations.map((sit: any, i: number) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex-1">
                        <p className="font-medium text-white">{sit.name}</p>
                        <p className="text-xs text-blue-200/50">{sit.pct}% of congregation</p>
                      </div>
                      <TrendBadge change={sit.trend} rising={sit.rising} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeSection === 'demographics' && (
            <>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-white mb-4">By Age Group</h3>
                  <div className="space-y-3">
                    {Object.entries(data.byAge).map(([age, pct]) => (
                      <div key={age} className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium">{age}</span>
                          <span className="text-lg font-bold text-white">{pct as number}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min((pct as number) * 2.5, 100)}%`, backgroundColor: color }} />
                        </div>
                        <p className="text-xs text-blue-200/50 mt-1">
                          {(pct as number) > 25 ? 'ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â 1 in ' + Math.round(100 / (pct as number)) + ' affected' : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-white mb-4">By Gender</h3>
                  <div className="space-y-3">
                    {Object.entries(data.byGender).map(([gender, pct]) => {
                      const genderColor = gender === 'Male' ? '#3b82f6' : '#ec4899';
                      return (
                        <div key={gender} className="bg-white/5 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-medium">{gender}</span>
                            <span className="text-lg font-bold text-white">{pct as number}%</span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min((pct as number) * 2.5, 100)}%`, backgroundColor: genderColor }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {data.byGender.Female > data.byGender.Male && (
                    <div className="mt-4 p-3 bg-pink-500/10 border border-pink-400/20 rounded-lg">
                      <p className="text-sm text-pink-200">
                        <strong className="text-pink-400">Insight:</strong> Women are {Math.round((data.byGender.Female / data.byGender.Male - 1) * 100)}% more likely to access this lifeline.
                      </p>
                    </div>
                  )}
                  {data.byGender.Male > data.byGender.Female && (
                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-400/20 rounded-lg">
                      <p className="text-sm text-blue-200">
                        <strong className="text-blue-400">Insight:</strong> Men are {Math.round((data.byGender.Male / data.byGender.Female - 1) * 100)}% more likely to access this lifeline.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeSection === 'ai-guidance' && (
            <div className="space-y-4">
              {data.aiGuidance?.map((guidance: any, i: number) => {
                const priorityColors: Record<string, string> = {
                  'critical': 'from-red-500/20 to-red-600/20 border-red-400/40',
                  'high': 'from-amber-500/20 to-orange-500/20 border-amber-400/40',
                  'medium': 'from-blue-500/20 to-cyan-500/20 border-blue-400/40',
                };
                
                return (
                  <div key={i} className={`bg-gradient-to-br ${priorityColors[guidance.priority]} rounded-xl p-5 border`}>
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                            guidance.priority === 'critical' ? 'bg-red-500 text-white' :
                            guidance.priority === 'high' ? 'bg-amber-500 text-gray-900' :
                            'bg-blue-500 text-white'
                          }`}>
                            {guidance.priority}
                          </span>
                          <span className="text-xs text-blue-200/50">{guidance.timing}</span>
                        </div>
                        <h4 className="font-bold text-white mb-2">{guidance.title}</h4>
                        <p className="text-sm text-blue-200/80">{guidance.description}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium text-white transition-colors">
                        Add to Calendar
                      </button>
                      <button className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 rounded-lg text-sm font-medium text-gray-900 transition-colors">
                        Generate Content
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeSection === 'content-gaps' && (
            <div>
              <h3 className="font-bold text-white mb-4">Content Opportunities</h3>
              <p className="text-sm text-blue-200/60 mb-4">Topics with high demand but low existing content</p>
              <div className="space-y-3">
                {data.contentGaps.map((gap: any, i: number) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-amber-400/50 transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-white group-hover:text-amber-300 transition-colors">{gap.topic}</p>
                        <p className="text-xs text-blue-200/50">{gap.existingContent} existing piece{gap.existingContent !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-amber-400">{gap.demandScore}%</p>
                        <p className="text-xs text-blue-200/50">demand</p>
                      </div>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" style={{ width: `${gap.demandScore}%` }} />
                    </div>
                    <button className="mt-3 w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 rounded-lg text-sm font-medium text-amber-300 transition-colors flex items-center justify-center gap-2">
                      <Icons.Sparkles />
                      Generate Content
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Comparison Panel
const ComparisonPanel = () => {
  const [selectedBenchmark, setSelectedBenchmark] = useState<'similarSize' | 'denomination' | 'regional'>('similarSize');
  const benchmark = benchmarkData[selectedBenchmark];
  const concerns = Object.entries(benchmark.data).filter(([_, v]: [string, any]) => v.status === 'concern');

  return (
    <div className="space-y-6">
      {/* Benchmark Selector */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(benchmarkData).map(([key, data]) => (
          <button
            key={key}
            onClick={() => setSelectedBenchmark(key as any)}
            className={`px-4 py-3 rounded-xl text-left transition-all ${
              selectedBenchmark === key
                ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-2 border-cyan-400/50'
                : 'bg-white/5 border border-white/10 hover:border-white/30'
            }`}
          >
            <p className={`font-semibold ${selectedBenchmark === key ? 'text-cyan-300' : 'text-white'}`}>{data.label}</p>
            <p className="text-xs text-blue-200/50">{data.description} ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ {data.count} churches</p>
          </button>
        ))}
      </div>

      {/* Concerns Alert */}
      {concerns.length > 0 && (
        <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl p-5 border border-red-400/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Icons.Warning />
            </div>
            <div>
              <h3 className="font-bold text-white">Areas Requiring Attention</h3>
              <p className="text-sm text-red-200/70">Your church is significantly above benchmark</p>
            </div>
          </div>
          <div className="space-y-2">
            {concerns.map(([name, data]: [string, any]) => (
              <div key={name} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                <span className="text-white font-medium">{name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-blue-200/50">Avg: {data.avg}%</span>
                  <span className="text-sm font-bold text-red-400">You: {data.yourChurch}%</span>
                  <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">+{(data.yourChurch - data.avg).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Comparison Table */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 bg-white/5">
          <h3 className="font-bold text-white">Full Lifeline Comparison</h3>
          <p className="text-sm text-blue-200/50">Percentage of congregation accessing each lifeline</p>
        </div>
        <div className="divide-y divide-white/10">
          {Object.entries(benchmark.data).map(([name, data]: [string, any]) => (
            <div key={name} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
              <div className="flex-1">
                <p className="font-medium text-white">{name}</p>
              </div>
              <div className="w-28 text-center">
                <p className="text-sm text-blue-200/50">Benchmark</p>
                <p className="text-lg font-semibold text-white">{data.avg}%</p>
              </div>
              <div className="w-28 text-center">
                <p className="text-sm text-blue-200/50">Your Church</p>
                <p className={`text-lg font-semibold ${
                  data.status === 'concern' ? 'text-red-400' :
                  data.status === 'above' ? 'text-amber-400' :
                  data.status === 'below' ? 'text-blue-400' : 'text-green-400'
                }`}>{data.yourChurch}%</p>
              </div>
              <div className="w-32">
                <StatusBadge status={data.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Radar Chart */}
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <h3 className="font-bold text-white mb-4">Visual Comparison</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={Object.entries(benchmark.data).map(([name, data]: [string, any]) => ({
              subject: name.split(' ').slice(0, 2).join(' '),
              benchmark: data.avg,
              yourChurch: data.yourChurch,
            }))}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 25]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Radar name="Benchmark" dataKey="benchmark" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} />
              <Radar name="Your Church" dataKey="yourChurch" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} formatter={(v: any) => `${v}%`} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cyan-500" />
            <span className="text-sm text-blue-200/70">{benchmark.label} Avg</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-sm text-blue-200/70">Your Church</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const PastoralGuidanceCard = ({ item, index }: { item: any; index: number }) => {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('sermons');
  const priorityColors: Record<string, string> = { 
    'Critical': 'bg-red-500/20 text-red-300 border-red-500/30', 
    'High': 'bg-amber-500/20 text-amber-300 border-amber-500/30', 
  };

  return (
    <div className={`bg-white/5 rounded-2xl border border-white/10 overflow-hidden transition-all hover:border-amber-400/50 cursor-pointer ${expanded ? 'ring-2 ring-amber-400' : ''}`} onClick={() => !expanded && setExpanded(true)}>
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ backgroundColor: item.color }}>{index + 1}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${priorityColors[item.priority]}`}>{item.priority}</span>
              <span className="text-xs text-blue-200/50">{item.lifeline}</span>
            </div>
            <h3 className="font-bold text-white mb-2">{item.title}</h3>
            <p className="text-blue-200/70 text-sm">{item.description}</p>
          </div>
        </div>
        {expanded && (
          <div className="mt-5 pt-5 border-t border-white/10 space-y-4" onClick={e => e.stopPropagation()}>
            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-3"><p className="text-xs text-blue-200/50 mb-1">Target</p><p className="font-semibold text-white text-sm">{item.audience}</p></div>
              <div className="bg-white/5 rounded-xl p-3"><p className="text-xs text-blue-200/50 mb-1">Impact</p><p className="font-semibold text-emerald-400 text-sm">{item.impact}</p></div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 bg-white/5 rounded-lg p-1">
              {['sermons', 'scripture', 'angles', 'questions'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${activeTab === tab ? 'bg-amber-500 text-gray-900' : 'text-white/60 hover:text-white'}`}>
                  {tab === 'sermons' && 'Your Sermons'}
                  {tab === 'scripture' && 'Scripture'}
                  {tab === 'angles' && 'Sermon Ideas'}
                  {tab === 'questions' && 'Small Group'}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'sermons' && (
              <div className="space-y-2">
                <p className="text-xs text-blue-200/50 mb-2">From your TrueTeachings library:</p>
                {item.pastSermons.map((sermon: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm">{sermon.title}</p>
                      <p className="text-xs text-blue-200/40">{sermon.date} | {sermon.verse}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded">{sermon.relevance}% match</span>
                      <Icons.ChevronRight />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'scripture' && (
              <div className="space-y-3">
                <p className="text-xs text-blue-200/50 mb-2">Relevant passages for this struggle:</p>
                {item.scriptureConnections.map((s: any, i: number) => (
                  <div key={i} className="p-3 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-lg border border-indigo-400/20">
                    <p className="font-semibold text-indigo-300 text-sm mb-1">{s.verse}</p>
                    <p className="text-white/80 text-sm italic">{s.text}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'angles' && (
              <div className="space-y-2">
                <p className="text-xs text-blue-200/50 mb-2">Ways to address this in upcoming messages:</p>
                {item.sermonAngles.map((angle: string, i: number) => (
                  <div key={i} className="flex gap-3 p-3 bg-white/5 rounded-lg">
                    <span className="text-amber-400 mt-0.5"><Icons.Lightbulb /></span>
                    <p className="text-white/80 text-sm">{angle}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'questions' && (
              <div className="space-y-2">
                <p className="text-xs text-blue-200/50 mb-2">Discussion starters for small groups:</p>
                {item.smallGroupQuestions.map((q: string, i: number) => (
                  <div key={i} className="flex gap-3 p-3 bg-white/5 rounded-lg">
                    <span className="text-cyan-400 font-bold text-sm">{i + 1}.</span>
                    <p className="text-white/80 text-sm">{q}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Close button */}
            <button onClick={() => setExpanded(false)} className="w-full py-2 text-sm text-white/50 hover:text-white/80 transition-colors">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============ MAIN COMPONENT ============

export default function ChurchDashboard() {
  const router = useRouter();
  const [selectedDemographic, setSelectedDemographic] = useState('All');
  const [selectedLifeline, setSelectedLifeline] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('rankings');

  const currentRankings = lifelineRankings[selectedDemographic] || lifelineRankings['All'];

  // Calculate top-level stats - ALL PERCENTAGES
  const overallStats = useMemo(() => {
    const all = lifelineRankings['All'];
    const highestPct = Math.max(...all.map(item => item.trendPcts[2]));
    const risingCount = all.filter(item => item.rising).length;
    const biggestRiser = all.reduce((max, item) => {
      const change = parseFloat(item.change);
      return change > parseFloat(max.change) ? item : max;
    }, all[0]);
    
    // Calculate total % in any lifeline (avoiding double-counting is complex, estimate ~45%)
    const totalPct = 45;
    
    return { totalPct, highestPct, risingCount, total: all.length, biggestRiser };
  }, []);

  // Calculate demographic filter percentages
  const getDemographicPct = (demo: string) => {
    const rankings = lifelineRankings[demo];
    if (!rankings) return undefined;
    // Return the highest lifeline % for this demographic
    return Math.max(...rankings.map(r => r.trendPcts[2]));
  };

  return (
    <div className="min-h-screen bg-[#0c1929]">
      {/* Header */}
      <header className="bg-[#0f2137]/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-4">
              <button 
                onClick={() => router.push('/church')}
                className="flex items-center gap-1 md:gap-2 text-white/60 hover:text-white transition-colors"
              >
                <Icons.ChevronLeft />
                <span className="text-sm hidden md:inline">Back</span>
              </button>
              <div className="w-px h-8 bg-white/20 hidden md:block" />
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                  <Icons.Compass />
                </div>
                <div>
                  <h1 className="text-lg md:text-xl font-bold text-white">{churchProfile.name}</h1>
                  <p className="text-xs text-blue-200/50 hidden md:block">{churchProfile.denomination} ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ {churchProfile.size}</p>
                </div>
              </div>
            </div>
            <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
              {['rankings', 'comparisons', 'ai-insights'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-2 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${activeTab === tab ? 'bg-amber-500 text-gray-900' : 'text-white/70 hover:text-white'}`}>
                  {tab === 'rankings' && <span><span className="hidden md:inline">ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…Â  </span>Rankings</span>}
                  {tab === 'comparisons' && <span><span className="hidden md:inline">ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‹â€  </span>Compare</span>}
                  {tab === 'ai-insights' && <span><span className="hidden md:inline">ÃƒÂ¢Ã…â€œÃ‚Â¨ </span>AI</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {activeTab === 'rankings' && (
          <>
            {/* Quick Stats - ALL PERCENTAGES */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8">
              <div className="bg-white/5 rounded-xl md:rounded-2xl p-3 md:p-5 border border-white/10">
                <p className="text-xs md:text-sm text-blue-200/50 mb-1">In a Lifeline</p>
                <p className="text-xl md:text-3xl font-bold text-white">~{overallStats.totalPct}%</p>
                <p className="text-xs text-blue-200/40">of congregation</p>
              </div>
              <div className="bg-white/5 rounded-xl md:rounded-2xl p-3 md:p-5 border border-white/10">
                <p className="text-xs md:text-sm text-blue-200/50 mb-1">Rising Issues</p>
                <p className="text-xl md:text-3xl font-bold text-red-400">{overallStats.risingCount} <span className="text-sm md:text-lg text-white/40">/ {overallStats.total}</span></p>
              </div>
              <div className="bg-gradient-to-br from-red-500/30 to-orange-500/30 rounded-xl md:rounded-2xl p-3 md:p-5 border border-red-400/30">
                <p className="text-xs md:text-sm text-white/70 mb-1">Fastest Rising</p>
                <p className="text-lg md:text-2xl font-bold text-white truncate">{overallStats.biggestRiser.name}</p>
                <p className="text-xs md:text-sm text-red-300">{overallStats.biggestRiser.change} in 3 mo</p>
              </div>
            </div>

            {/* Demographic Filter */}
            <div className="mb-4 md:mb-6">
              <p className="text-xs text-blue-200/50 mb-2 md:mb-3 font-medium uppercase tracking-wide">View Rankings For</p>
              <div className="flex flex-wrap gap-2">
                {['All', ...ageGroups, ...genders].map(demo => (
                  <FilterPill 
                    key={demo} 
                    label={demo === 'All' ? 'Everyone' : demo} 
                    selected={selectedDemographic === demo} 
                    onClick={() => setSelectedDemographic(demo)}
                    pct={demo !== 'All' ? getDemographicPct(demo) : undefined}
                  />
                ))}
              </div>
            </div>

            {/* Rankings List */}
            <div className="space-y-2 md:space-y-3">
              <div className="hidden md:flex items-center justify-between px-4 text-xs text-blue-200/40 uppercase tracking-wide">
                <span>Rank / Lifeline</span>
                <span className="mr-16">3-Month Trend / % of {selectedDemographic === 'All' ? 'Congregation' : selectedDemographic + 's'}</span>
              </div>
              {currentRankings.map((item, i) => (
                <LifelineRankingRow 
                  key={item.name} 
                  rank={i + 1} 
                  item={item}
                  demographic={selectedDemographic}
                  onClick={() => setSelectedLifeline(item.name)}
                />
              ))}
            </div>

            {/* Legend */}
            <div className="mt-6 md:mt-8 flex items-center justify-center gap-4 md:gap-8 text-xs md:text-sm text-blue-200/50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Rising</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>Declining</span>
              </div>
            </div>
            
            <p className="text-center text-blue-200/40 text-xs mt-4">
              Click any lifeline for detailed insights and AI guidance
            </p>
          </>
        )}

        {activeTab === 'comparisons' && (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Benchmark Comparisons</h2>
              <p className="text-blue-200/70">See how your congregation compares to similar churches</p>
            </div>
            <ComparisonPanel />
          </>
        )}

        {activeTab === 'ai-insights' && (
          <>
            <div className="bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-red-500/20 rounded-2xl p-6 md:p-8 mb-6 md:mb-8 border border-amber-400/30">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-400/20 rounded-xl">
                  <span className="text-amber-400"><Icons.Sparkles /></span>
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Pastoral Guidance</h2>
                  <p className="text-blue-200/70 text-sm md:text-base max-w-2xl">How youve addressed these struggles before, Scripture connections, and sermon ideas.</p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3 md:gap-6 text-xs md:text-sm">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-white/70">Critical (3)</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-white/70">High (3)</span></div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {pastoralGuidance.map((item, i) => <PastoralGuidanceCard key={item.id} item={item} index={i} />)}
            </div>
          </>
        )}
      </main>

      {/* Lifeline Detail Panel */}
      {selectedLifeline && (
        <LifelineDetailPanel lifeline={selectedLifeline} onClose={() => setSelectedLifeline(null)} />
      )}

      <footer className="border-t border-white/10 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <p className="text-sm text-blue-200/40 text-center">LifeStages ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ Pastoral Intelligence Dashboard</p>
        </div>
      </footer>
    </div>
  );
}
