Públicas:
    GET /
    POST /auth/login
    GET /cardapio/produtos
    GET /t_itpromo
    GET /t_fpgto/public
    GET /t_tpgto/public
    POST /t_cli/public/lookup
    GET /t_vendas/public/:id
    POST /t_pedidosonline/public

Privadas:

    # Auth
    GET /auth/me
    GET /auth/companies_user

    # Upload
    POST /upload/presigned

    # Orders admin
    PATCH /admin/orders/:id/status
    GET /admin/orders/:id/history
    POST /admin/pedidos-online/:id/confirmar
    # Confirma pedido online e atualiza VLR_UNIT_CALC/VLR_TOTAL_CALC em T_PedidosOnLineItens

    # Inventory
    GET /inventory/movements/summary
    GET /inventory/movements
    GET /inventory/movements/:itemId
    POST /inventory/movements

    # Production (BOM)
    GET /production/bom/product/:productCode
    GET /production/bom
    POST /production/bom
    GET /production/bom/:id
    GET /production/bom/:id/pdf
    PATCH /production/bom/:id
    DELETE /production/bom/:id

    # Production (orders)
    POST /production/orders
    GET /production/orders
    GET /production/orders/separacao
    GET /production/orders/producao
    GET /production/orders/:id
    PATCH /production/orders/:id
    POST /production/orders/:id/status
    POST /production/orders/:id/issue-raw-materials
    POST /production/orders/:id/complete
    GET /production/orders/:id/status
    POST /production/orders/:id/finished-goods
    GET /production/orders/:id/finished-goods
    POST /production/orders/:id/raw-materials
    GET /production/orders/:id/raw-materials

    # Itens
    POST /t_itens
    PATCH /t_itens/:id
    GET /t_itens
    GET /t_itens/search
    GET /t_itens/:id
    DELETE /t_itens/:id

    # Grupos de itens
    POST /t_gritens
    PATCH /t_gritens/:id
    DELETE /t_gritens/:id
    GET /t_gritens
    GET /t_gritens/:id

    # Itens combo
    POST /t_itenscombo
    GET /t_itenscombo
    GET /t_itenscombo/:id
    PATCH /t_itenscombo/:id
    DELETE /t_itenscombo/:id

    # Formulas
    POST /t_formulas
    GET /t_formulas/:id
    DELETE /t_formulas/:id

    # Promocoes (admin)
    POST /t_itpromo
    PATCH /t_itpromo/:autocod
    DELETE /t_itpromo/:autocod

    # TenantTablesModule (rotas geradas dinamicamente; todas privadas)
    # Para cada rota abaixo existem: POST /<rota>, GET /<rota>, GET /<rota>/:pk(s), PATCH /<rota>/:pk(s), DELETE /<rota>/:pk(s)
    # t_gritens :cdgru
    # t_emp :cdemp
    # t_cli :id
    # t_for :cdemp/:cdfor
    # t_movest :nrlan/:cdemp
    # t_vendas :autocod_v/:nrven_v/:cdemp_v
    # t_itsven :registro/:empven
    # t_users :codigo
    # t_tpgto :cdtpg
    # t_fpgto :cdfpg
    # t_formacao :autocod
    # t_rec :autocod/:codemp
    # t_recb :autocod/:cdemp
    # t_pag :autocod/:cdemp
    # t_pagb :autocod/:cdemp
    # t_placon :codred
    # t_debcrecli :cdemp/:nrlan
    # t_lote :autocod
    # t_loteenv :autocod
    # t_vende :cdven
    # t_pedcmp :nrreq/:cdemp
    # t_itpedcmp :registro/:cdemp
    # t_pdc :nrreq
    # t_itpdc :registro/:cdemp
    # t_nfs :autocod/:cdemp
    # t_itnfs :seq/:cdemp
    # t_orc :cdemp/:cdorc
    # t_itorc :seq/:cdemp
    # t_socio :autocod

