'use strict';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
let pickerReady = false;
let identityReady = false;
const selected = new Map();
function ready() {
  document.getElementById('select').disabled = !(pickerReady && identityReady);
  if (pickerReady && identityReady) document.getElementById('status').textContent = 'Pronto para selecionar.';
}
function pickerLoaded() { gapi.load('picker', () => { pickerReady = true; ready(); }); }
function identityLoaded() { identityReady = true; ready(); }
function display() {
  document.getElementById('ids').value = JSON.stringify([...selected.keys()]);
  const list = document.getElementById('files');
  list.replaceChildren();
  selected.forEach((name, id) => {
    const item = document.createElement('li');
    item.textContent = `${name} — ${id}`; // nunca interpretar nomes como HTML
    list.append(item);
  });
}
document.getElementById('clear').onclick = () => { selected.clear(); display(); };
document.getElementById('select').onclick = () => {
  const client = document.getElementById('client').value.trim();
  const key = document.getElementById('key').value.trim();
  const project = document.getElementById('project').value.trim();
  if (!client || !key || !/^\d+$/.test(project)) {
    document.getElementById('status').textContent = 'Preencha as três configurações públicas do mesmo projeto.';
    return;
  }
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: client, scope: SCOPE, include_granted_scopes: false,
    callback: response => {
      if (response.error || !response.access_token ||
          response.scope?.split(/\s+/).filter(Boolean).join(' ') !== SCOPE) {
        document.getElementById('status').textContent = 'Autorização recusada ou escopo inesperado. Revogue a conexão antiga e tente novamente.';
        return;
      }
      const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
        .setIncludeFolders(false).setSelectFolderEnabled(false);
      const picker = new google.picker.PickerBuilder().addView(view)
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .setOAuthToken(response.access_token).setDeveloperKey(key).setAppId(project)
        .setOrigin(window.location.origin).setCallback(data => {
          if (data.action === google.picker.Action.PICKED) {
            for (const doc of data.docs || []) {
              if (/^[A-Za-z0-9_-]{1,200}$/.test(doc.id)) selected.set(doc.id, doc.name || doc.id);
            }
            display();
            document.getElementById('status').textContent = 'Seleção recebida. Atualize a variável no GitHub e valide no modo listar.';
          }
          if (data.action === google.picker.Action.PICKED || data.action === google.picker.Action.CANCEL) {
            response.access_token = ''; // sem armazenamento persistente
            picker.dispose();
          }
        }).build();
      picker.setVisible(true);
    },
    error_callback: () => { document.getElementById('status').textContent = 'Janela de autorização cancelada ou bloqueada.'; }
  });
  tokenClient.requestAccessToken({prompt: 'consent'});
};
