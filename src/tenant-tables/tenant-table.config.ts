export type PrimaryKeyType = 'number' | 'string';

export interface TenantTableConfig {
  name: string;
  route?: string;
  primaryKeys: Array<{
    name: string;
    type: PrimaryKeyType;
  }>;
}

export const TENANT_TABLE_CONFIGS: TenantTableConfig[] = [
  { name: 't_gritens', primaryKeys: [{ name: 'cdgru', type: 'number' }] },
  { name: 't_emp', primaryKeys: [{ name: 'cdemp', type: 'number' }] },
  { name: 't_cli', primaryKeys: [{ name: 'id', type: 'string' }] },
  {
    name: 't_for',
    primaryKeys: [
      { name: 'cdemp', type: 'number' },
      { name: 'cdfor', type: 'number' },
    ],
  },
  {
    name: 't_movest',
    primaryKeys: [
      { name: 'nrlan', type: 'number' },
      { name: 'cdemp', type: 'number' },
    ],
  },
  {
    name: 't_vendas',
    primaryKeys: [
      { name: 'autocod_v', type: 'number' },
      { name: 'nrven_v', type: 'number' },
      { name: 'cdemp_v', type: 'number' },
    ],
  },
  {
    name: 't_itsven',
    primaryKeys: [
      { name: 'registro', type: 'number' },
      { name: 'empven', type: 'number' },
    ],
  },
  { name: 't_users', primaryKeys: [{ name: 'codigo', type: 'number' }] },
  { name: 't_tpgto', primaryKeys: [{ name: 'cdtpg', type: 'number' }] },
  { name: 't_fpgto', primaryKeys: [{ name: 'cdfpg', type: 'number' }] },
  { name: 't_formacao', primaryKeys: [{ name: 'autocod', type: 'number' }] },
  {
    name: 't_rec',
    primaryKeys: [
      { name: 'autocod', type: 'number' },
      { name: 'codemp', type: 'number' },
    ],
  },
  {
    name: 't_recb',
    primaryKeys: [
      { name: 'autocod', type: 'number' },
      { name: 'cdemp', type: 'number' },
    ],
  },
  {
    name: 't_pag',
    primaryKeys: [
      { name: 'autocod', type: 'number' },
      { name: 'cdemp', type: 'number' },
    ],
  },
  {
    name: 't_pagb',
    primaryKeys: [
      { name: 'autocod', type: 'number' },
      { name: 'cdemp', type: 'number' },
    ],
  },
  { name: 't_placon', primaryKeys: [{ name: 'codred', type: 'number' }] },
  {
    name: 't_debcrecli',
    primaryKeys: [
      { name: 'cdemp', type: 'number' },
      { name: 'nrlan', type: 'number' },
    ],
  },
  { name: 't_lote', primaryKeys: [{ name: 'autocod', type: 'number' }] },
  { name: 't_loteenv', primaryKeys: [{ name: 'autocod', type: 'number' }] },
  { name: 't_vende', primaryKeys: [{ name: 'cdven', type: 'number' }] },
  {
    name: 't_pedcmp',
    primaryKeys: [
      { name: 'nrreq', type: 'number' },
      { name: 'cdemp', type: 'number' },
    ],
  },
  {
    name: 't_itpedcmp',
    primaryKeys: [
      { name: 'registro', type: 'number' },
      { name: 'cdemp', type: 'number' },
    ],
  },
  { name: 't_pdc', primaryKeys: [{ name: 'nrreq', type: 'number' }] },
  {
    name: 't_itpdc',
    primaryKeys: [
      { name: 'registro', type: 'number' },
      { name: 'cdemp', type: 'number' },
    ],
  },
  {
    name: 't_nfs',
    primaryKeys: [
      { name: 'autocod', type: 'number' },
      { name: 'cdemp', type: 'number' },
    ],
  },
  {
    name: 't_itnfs',
    primaryKeys: [
      { name: 'seq', type: 'number' },
      { name: 'cdemp', type: 'number' },
    ],
  },
  {
    name: 't_orc',
    primaryKeys: [
      { name: 'cdemp', type: 'number' },
      { name: 'cdorc', type: 'number' },
    ],
  },
  {
    name: 't_itorc',
    primaryKeys: [
      { name: 'seq', type: 'number' },
      { name: 'cdemp', type: 'number' },
    ],
  },
  {
    name: 't_socio',
    primaryKeys: [
      { name: 'autocod', type: 'number' },
    ],
  },
];
