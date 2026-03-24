import { useState, useEffect, useRef } from 'react'

const CODENAMES = [
  'Albatross', 'Amber', 'Anvil', 'Apollo', 'Arcadia', 'Arctic', 'Argon', 'Arrowhead', 'Atlas', 'Aurora',
  'Avalanche', 'Axiom', 'Azimuth', 'Badger', 'Basalt', 'Beacon', 'Bedrock', 'Bison', 'Blizzard', 'Blueprint',
  'Bolide', 'Boreal', 'Borealis', 'Breaker', 'Brimstone', 'Bronze', 'Bulwark', 'Cadence', 'Caldera', 'Canopy',
  'Canyon', 'Capsule', 'Carbon', 'Cascade', 'Catalyst', 'Cavern', 'Cedar', 'Celestial', 'Centaur', 'Cerberus',
  'Chalice', 'Chimera', 'Chrome', 'Cipher', 'Circuit', 'Citadel', 'Cobalt', 'Comet', 'Compass', 'Condor',
  'Copper', 'Coral', 'Coriolis', 'Corsair', 'Coyote', 'Crater', 'Crimson', 'Criterion', 'Crossbow', 'Crucible',
  'Crystal', 'Cyclone', 'Dagger', 'Dawnlight', 'Delphi', 'Delta', 'Denali', 'Diamond', 'Dolomite', 'Dynamo',
  'Eclipse', 'Eider', 'Emblem', 'Ember', 'Epoch', 'Equinox', 'Escarpment', 'Falcon', 'Fathom', 'Feldspar',
  'Fjord', 'Flint', 'Forge', 'Fossil', 'Foxglove', 'Fractal', 'Frostline', 'Fulcrum', 'Gabbro', 'Galena',
  'Garnet', 'Geyser', 'Glacier', 'Granite', 'Greystone', 'Griffin', 'Grizzly', 'Gust', 'Hallmark', 'Harrier',
  'Hawkstone', 'Hazel', 'Helix', 'Hemlock', 'Highland', 'Horizon', 'Hornbeam', 'Hydra', 'Iceberg', 'Ignite',
  'Indigo', 'Inertia', 'Inkstone', 'Ion', 'Ironwood', 'Isthmus', 'Ivory', 'Jade', 'Jasper', 'Javelin',
  'Juniper', 'Keystone', 'Kilowatt', 'Kite', 'Krypton', 'Lacewing', 'Lancer', 'Lapis', 'Larch', 'Lava',
  'Ledger', 'Lichen', 'Linchpin', 'Lodestone', 'Lynx', 'Magma', 'Malachite', 'Mammoth', 'Mantis', 'Marigold',
  'Marlin', 'Marmot', 'Marquise', 'Maul', 'Meridian', 'Mesa', 'Meteor', 'Midpoint', 'Milestone', 'Mirage',
  'Mist', 'Moraine', 'Mosaic', 'Mustang', 'Nebula', 'Nexus', 'Nimbus', 'Nocturn', 'Nordic', 'Obsidian',
  'Oculus', 'Olivine', 'Onyx', 'Opal', 'Orbit', 'Osprey', 'Outpost', 'Overture', 'Oxide', 'Ozone',
  'Paragon', 'Pebble', 'Pegasus', 'Penumbra', 'Permafrost', 'Phoenix', 'Pillar', 'Pinnacle', 'Pioneer', 'Plasma',
  'Plateau', 'Polaris', 'Porcupine', 'Prism', 'Proton', 'Pumice', 'Quartz', 'Quicksilver', 'Quill', 'Rampart',
  'Raptor', 'Ravine', 'Redwood', 'Reef', 'Ridgeline', 'Rift', 'Rigel', 'Rimrock', 'Riverbend', 'Rockfall',
]

const STORAGE_KEY = 'client-tagger-data'

// Stable color palette for tags — cycles by index
const TAG_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48', '#a3e635', '#7c3aed', '#0ea5e9',
]

function getTagColor(tagName, tagGroups, allTags) {
  const group = tagGroups.find(g => g.tags.includes(tagName))
  if (group) return group.color
  // ungrouped: cycle palette by position among ungrouped tags only
  const ungrouped = allTags.filter(t => !tagGroups.some(g => g.tags.includes(t)))
  const idx = ungrouped.indexOf(tagName)
  return TAG_COLORS[(idx >= 0 ? idx : 0) % TAG_COLORS.length]
}

function nextGroupColor(tagGroups) {
  return TAG_COLORS[tagGroups.length % TAG_COLORS.length]
}

function buildInitialData() {
  return {
    clients: CODENAMES.map((name) => ({
      id: name.toLowerCase(),
      codename: name,
      actualName: '',
      tags: [],
    })),
    tags: [],
    tagGroups: [],
  }
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // Merge: keep stored data but add any missing codenames
      const storedIds = new Set(parsed.clients.map((c) => c.id))
      const missing = CODENAMES.filter((n) => !storedIds.has(n.toLowerCase())).map((name) => ({
        id: name.toLowerCase(),
        codename: name,
        actualName: '',
        tags: [],
      }))
      return {
        clients: [...parsed.clients, ...missing],
        tags: parsed.tags || [],
        tagGroups: parsed.tagGroups || [],
      }
    }
  } catch (e) {
    // ignore parse errors
  }
  return buildInitialData()
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export default function App() {
  const [data, setData] = useState(() => loadData())
  const [selectedClientId, setSelectedClientId] = useState(null)
  const [filterTag, setFilterTag] = useState(null)
  const [search, setSearch] = useState('')
  const [importError, setImportError] = useState(null)
  const [showRealNames, setShowRealNames] = useState(false)
  const importInputRef = useRef(null)

  // Persist on every change
  useEffect(() => {
    saveData(data)
  }, [data])

  const { clients, tags, tagGroups } = data

  // Derived: tag -> count
  const tagCounts = {}
  for (const tag of tags) tagCounts[tag] = 0
  for (const client of clients) {
    for (const tag of client.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
    }
  }

  // Filtered client list, starred first
  const visibleClients = clients
    .filter((c) => {
      const matchesSearch = c.codename.toLowerCase().includes(search.toLowerCase())
      const matchesTag = filterTag ? c.tags.includes(filterTag) : true
      return matchesSearch && matchesTag
    })
    .sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0))

  function exportData() {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `client-tagger-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result)
        if (!Array.isArray(parsed.clients) || !Array.isArray(parsed.tags)) {
          throw new Error('Invalid format: expected { clients, tags }')
        }
        // Merge: imported clients override stored ones; new codenames seeded fresh
        const importedIds = new Set(parsed.clients.map((c) => c.id))
        const missing = CODENAMES.filter((n) => !importedIds.has(n.toLowerCase())).map((name) => ({
          id: name.toLowerCase(),
          codename: name,
          actualName: '',
          tags: [],
        }))
        setData({
          clients: [...parsed.clients, ...missing],
          tags: parsed.tags,
          tagGroups: parsed.tagGroups || [],
        })
        setImportError(null)
      } catch (err) {
        setImportError(err.message)
      }
      // Reset input so the same file can be re-imported
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  function updateClient(id, changes) {
    setData((prev) => ({
      ...prev,
      clients: prev.clients.map((c) => (c.id === id ? { ...c, ...changes } : c)),
    }))
  }

  function addTagToClient(clientId, tag) {
    const trimmed = tag.trim()
    if (!trimmed) return
    setData((prev) => {
      const newTags = prev.tags.includes(trimmed) ? prev.tags : [...prev.tags, trimmed]
      const newClients = prev.clients.map((c) => {
        if (c.id !== clientId) return c
        if (c.tags.includes(trimmed)) return c
        return { ...c, tags: [...c.tags, trimmed] }
      })
      return { ...prev, clients: newClients, tags: newTags }
    })
  }

  function removeTagFromClient(clientId, tag) {
    setData((prev) => {
      const newClients = prev.clients.map((c) =>
        c.id === clientId ? { ...c, tags: c.tags.filter((t) => t !== tag) } : c
      )
      const stillUsed = newClients.some((c) => c.tags.includes(tag))
      return {
        ...prev,
        clients: newClients,
        tags: stillUsed ? prev.tags : prev.tags.filter((t) => t !== tag),
        tagGroups: stillUsed
          ? prev.tagGroups
          : prev.tagGroups.map((g) => ({ ...g, tags: g.tags.filter((t) => t !== tag) })),
      }
    })
  }

  function createGroup(name) {
    setData(prev => ({
      ...prev,
      tagGroups: [...prev.tagGroups, {
        id: Date.now().toString(),
        name,
        color: nextGroupColor(prev.tagGroups),
        tags: [],
      }]
    }))
  }

  function renameGroup(id, name) {
    setData(prev => ({
      ...prev,
      tagGroups: prev.tagGroups.map(g => g.id === id ? { ...g, name } : g)
    }))
  }

  function deleteGroup(id) {
    setData(prev => ({
      ...prev,
      tagGroups: prev.tagGroups.filter(g => g.id !== id)
    }))
  }

  function deleteTag(tag) {
    setData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
      tagGroups: prev.tagGroups.map(g => ({ ...g, tags: g.tags.filter(t => t !== tag) })),
    }))
  }

  function moveTagToGroup(tag, groupId) {
    // groupId can be null to ungroup
    setData(prev => ({
      ...prev,
      tagGroups: prev.tagGroups.map(g => {
        if (g.id === groupId) return { ...g, tags: g.tags.includes(tag) ? g.tags : [...g.tags, tag] }
        return { ...g, tags: g.tags.filter(t => t !== tag) }
      })
    }))
  }

  const ungroupedTags = tags.filter(t => !tagGroups.some(g => g.tags.includes(t)))

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h2 className="sidebar-title">Tags</h2>
        <button
          className={`tag-filter-item ${filterTag === null ? 'active' : ''}`}
          onClick={() => setFilterTag(null)}
        >
          <span className="tag-filter-name">All clients</span>
          <span className="tag-filter-count">{clients.length}</span>
        </button>

        <NewGroupButton onCreate={createGroup} />

        {tags.length === 0 && tagGroups.length === 0 && (
          <p className="sidebar-empty">No tags yet. Add tags to clients to see them here.</p>
        )}

        {tagGroups.map((group) => (
          <SidebarGroup
            key={group.id}
            group={group}
            tagCounts={tagCounts}
            filterTag={filterTag}
            onFilterTag={setFilterTag}
            onRename={(name) => renameGroup(group.id, name)}
            onDelete={() => deleteGroup(group.id)}
            onUngroup={(tag) => moveTagToGroup(tag, null)}
            onAssignTag={(tag) => moveTagToGroup(tag, group.id)}
            onDeleteTag={deleteTag}
          />
        ))}

        <UngroupedSection
          tags={ungroupedTags}
          tagGroups={tagGroups}
          tagCounts={tagCounts}
          filterTag={filterTag}
          onFilter={(tag) => setFilterTag(filterTag === tag ? null : tag)}
          onUngroup={(tag) => moveTagToGroup(tag, null)}
          onDeleteTag={deleteTag}
        />
      </aside>

      <main className="main-content">
        <header className="main-header">
          <div className="header-top">
            <h1 className="app-title">Client Tagger</h1>
            <div className="data-actions">
              <label className="toggle-label">
                <span className="toggle-text">Real names</span>
                <span className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={showRealNames}
                    onChange={() => setShowRealNames((v) => !v)}
                  />
                  <span className="toggle-track">
                    <span className="toggle-thumb" />
                  </span>
                </span>
              </label>
              <button className="action-btn" onClick={exportData}>Export JSON</button>
              <button className="action-btn" onClick={() => importInputRef.current?.click()}>Import JSON</button>
              <input
                ref={importInputRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={handleImportFile}
              />
            </div>
          </div>
          {importError && (
            <p className="import-error">Import failed: {importError}</p>
          )}
          <div className="search-row">
            <input
              className="search-input"
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {filterTag && (
              <button className="clear-filter-btn" onClick={() => setFilterTag(null)}>
                Filtered by: <strong>{filterTag}</strong> &times; Clear
              </button>
            )}
          </div>
          <p className="result-count">
            Showing {visibleClients.length} of {clients.length} clients
          </p>
        </header>

        <div className="client-list">
          {visibleClients.map((client) => (
            <ClientRow
              key={client.id}
              client={client}
              allTags={tags}
              tagGroups={tagGroups}
              isSelected={selectedClientId === client.id}
              showRealNames={showRealNames}
              onSelect={() =>
                setSelectedClientId(selectedClientId === client.id ? null : client.id)
              }
              onAddTag={(tag) => addTagToClient(client.id, tag)}
              onRemoveTag={(tag) => removeTagFromClient(client.id, tag)}
              onUpdateClient={(changes) => updateClient(client.id, changes)}
              getTagColor={(tag) => getTagColor(tag, tagGroups, tags)}
            />
          ))}
        </div>
      </main>
    </div>
  )
}

// ===== Sidebar sub-components =====

function NewGroupButton({ onCreate }) {
  const [isOpen, setIsOpen] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef(null)

  function open() {
    setIsOpen(true)
    setValue('')
    // focus on next tick after render
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function confirm() {
    const trimmed = value.trim()
    if (trimmed) {
      onCreate(trimmed)
    }
    setIsOpen(false)
    setValue('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') confirm()
    else if (e.key === 'Escape') {
      setIsOpen(false)
      setValue('')
    }
  }

  return (
    <div className="new-group-wrapper">
      {!isOpen && (
        <button className="new-group-btn" onClick={open}>
          + New group
        </button>
      )}
      {isOpen && (
        <div className="new-group-form">
          <input
            ref={inputRef}
            className="new-group-input"
            type="text"
            placeholder="Group name..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="new-group-confirm" onClick={confirm} title="Create group">
            &#10003;
          </button>
          <button
            className="new-group-cancel"
            onClick={() => { setIsOpen(false); setValue('') }}
            title="Cancel"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  )
}

function SidebarGroup({ group, tagCounts, filterTag, onFilterTag, onRename, onDelete, onUngroup, onAssignTag, onDeleteTag }) {
  const [editing, setEditing] = useState(false)
  const [nameValue, setNameValue] = useState(group.name)
  const [dragOver, setDragOver] = useState(false)
  const nameInputRef = useRef(null)

  function startEdit() {
    setNameValue(group.name)
    setEditing(true)
    setTimeout(() => nameInputRef.current?.focus(), 0)
  }

  function commitEdit() {
    const trimmed = nameValue.trim()
    if (trimmed && trimmed !== group.name) onRename(trimmed)
    setEditing(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') commitEdit()
    else if (e.key === 'Escape') { setNameValue(group.name); setEditing(false) }
  }

  function handleDragOver(e) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDrop(e) {
    e.preventDefault()
    const tag = e.dataTransfer.getData('text/plain')
    if (tag) onAssignTag(tag)
    setDragOver(false)
  }

  return (
    <div
      className={`sidebar-group ${dragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="sidebar-group-header">
        <span
          className="tag-dot"
          style={{ background: group.color, width: 10, height: 10, flexShrink: 0 }}
        />
        {editing ? (
          <input
            ref={nameInputRef}
            className="sidebar-group-name-input"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <span className="sidebar-group-name" onClick={startEdit} title="Click to rename">
            {group.name}
          </span>
        )}
        <button className="sidebar-group-delete" onClick={onDelete} title="Delete group">
          &times;
        </button>
      </div>

      {group.tags.map((tag) => (
        <div
          key={tag}
          className="grouped-tag-row"
          draggable
          onDragStart={(e) => e.dataTransfer.setData('text/plain', tag)}
        >
          <button
            className={`tag-filter-item tag-filter-item-indented ${filterTag === tag ? 'active' : ''}`}
            onClick={() => onFilterTag(filterTag === tag ? null : tag)}
          >
            <span className="tag-dot" style={{ background: group.color }} />
            <span className="tag-filter-name">{tag}</span>
            <span className="tag-filter-count">{tagCounts[tag] || 0}</span>
            {(tagCounts[tag] || 0) === 0 && (
              <button
                className="sidebar-tag-delete-btn"
                title="Delete tag"
                onClick={(e) => { e.stopPropagation(); onDeleteTag(tag) }}
              >
                &#x1F5D1;
              </button>
            )}
            <button
              className="sidebar-tag-ungroup-btn"
              title="Remove from group"
              onClick={(e) => { e.stopPropagation(); onUngroup(tag) }}
            >
              &times;
            </button>
          </button>
        </div>
      ))}

      {group.tags.length === 0 && (
        <p className="sidebar-group-empty">Drop a tag here or add one to a client.</p>
      )}
    </div>
  )
}

function UngroupedSection({ tags, tagGroups, tagCounts, filterTag, onFilter, onUngroup, onDeleteTag }) {
  const [dragOver, setDragOver] = useState(false)

  if (tags.length === 0 && tagGroups.length === 0) return null

  return (
    <>
      {tags.length > 0 && <div className="sidebar-ungrouped-header">Ungrouped</div>}
      <div
        className={`ungrouped-drop-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          const tag = e.dataTransfer.getData('text/plain')
          if (tag) onUngroup(tag)
          setDragOver(false)
        }}
      >
        {tags.map((tag) => (
          <div
            key={tag}
            className="ungrouped-tag-row"
            draggable
            onDragStart={(e) => e.dataTransfer.setData('text/plain', tag)}
          >
            <button
              className={`tag-filter-item ${filterTag === tag ? 'active' : ''}`}
              onClick={() => onFilter(tag)}
            >
              <span className="tag-dot" style={{ background: '#64748b' }} />
              <span className="tag-filter-name">{tag}</span>
              <span className="tag-filter-count">{tagCounts[tag] || 0}</span>
              {(tagCounts[tag] || 0) === 0 && (
                <button
                  className="sidebar-tag-delete-btn"
                  title="Delete tag"
                  onClick={(e) => { e.stopPropagation(); onDeleteTag(tag) }}
                >
                  &#x1F5D1;
                </button>
              )}
            </button>
          </div>
        ))}
        {tags.length === 0 && tagGroups.length > 0 && (
          <p className="sidebar-group-empty" style={{ padding: '6px 20px' }}>Drag tags here to ungroup.</p>
        )}
      </div>
    </>
  )
}

// ===== Client components =====

function ClientRow({
  client,
  allTags,
  tagGroups,
  isSelected,
  showRealNames,
  onSelect,
  onAddTag,
  onRemoveTag,
  onUpdateClient,
  getTagColor,
}) {
  const hasTags = client.tags.length > 0

  return (
    <div className={`client-card ${isSelected ? 'selected' : ''} ${!hasTags ? 'no-tags' : ''} ${client.starred ? 'starred' : ''}`}>
      <div className="client-summary" onClick={onSelect} role="button" tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onSelect()}>
        <button
          className={`star-btn ${client.starred ? 'star-btn-on' : ''}`}
          title={client.starred ? 'Unstar' : 'Star'}
          onClick={(e) => { e.stopPropagation(); onUpdateClient({ starred: !client.starred }) }}
        >
          {client.starred ? '★' : '☆'}
        </button>
        <div className="client-summary-left">
          <span className="client-codename">{client.codename}</span>
          {showRealNames && client.actualName && (
            <span className="client-actual-name">{client.actualName}</span>
          )}
        </div>
        <div className="client-tags-preview">
          {client.tags.map((tag) => (
            <span
              key={tag}
              className="tag-badge"
              style={{ background: getTagColor(tag) }}
            >
              {tag}
            </span>
          ))}
          {!hasTags && <span className="no-tags-label">no tags</span>}
        </div>
        <span className={`expand-icon ${isSelected ? 'open' : ''}`}>&#9656;</span>
      </div>

      {isSelected && (
        <ClientEditPanel
          client={client}
          allTags={allTags}
          tagGroups={tagGroups}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          onUpdateClient={onUpdateClient}
          getTagColor={getTagColor}
        />
      )}
    </div>
  )
}

function ClientEditPanel({ client, allTags, onAddTag, onRemoveTag, onUpdateClient, getTagColor }) {
  const [tagInput, setTagInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef(null)
  const suggestionsRef = useRef(null)

  const availableTags = allTags.filter(
    (t) => !client.tags.includes(t) && t.toLowerCase().includes(tagInput.toLowerCase())
  )

  const newTagOption =
    tagInput.trim() &&
    !allTags.some((t) => t.toLowerCase() === tagInput.trim().toLowerCase()) &&
    !client.tags.some((t) => t.toLowerCase() === tagInput.trim().toLowerCase())

  function handleAddTag(tag) {
    onAddTag(tag)
    setTagInput('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && tagInput.trim()) {
      handleAddTag(tagInput.trim())
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="client-edit-panel">
      <div className="edit-field">
        <label className="edit-label">Actual name (private)</label>
        <input
          className="edit-input"
          type="text"
          placeholder="Enter actual company name..."
          value={client.actualName}
          onChange={(e) => onUpdateClient({ actualName: e.target.value })}
        />
      </div>

      <div className="edit-field">
        <label className="edit-label">Tags</label>
        <div className="current-tags">
          {client.tags.length === 0 && <span className="no-tags-hint">No tags added yet.</span>}
          {client.tags.map((tag) => (
            <span
              key={tag}
              className="tag-badge tag-badge-removable"
              style={{ background: getTagColor(tag) }}
            >
              {tag}
              <button
                className="tag-remove-btn"
                onClick={() => onRemoveTag(tag)}
                title={`Remove ${tag}`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>

        <div className="tag-input-wrapper">
          <input
            ref={inputRef}
            className="edit-input tag-add-input"
            type="text"
            placeholder="Type to add or create a tag..."
            value={tagInput}
            onChange={(e) => {
              setTagInput(e.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
          />
          {showSuggestions && (availableTags.length > 0 || newTagOption) && (
            <ul className="tag-suggestions" ref={suggestionsRef}>
              {newTagOption && (
                <li
                  className="tag-suggestion tag-suggestion-new"
                  onMouseDown={() => handleAddTag(tagInput.trim())}
                >
                  Create tag: <strong>{tagInput.trim()}</strong>
                </li>
              )}
              {availableTags.map((tag) => (
                <li
                  key={tag}
                  className="tag-suggestion"
                  onMouseDown={() => handleAddTag(tag)}
                >
                  <span
                    className="tag-dot"
                    style={{ background: getTagColor(tag) }}
                  />
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="tag-hint">Press Enter to add, or select from suggestions.</p>
      </div>
    </div>
  )
}
