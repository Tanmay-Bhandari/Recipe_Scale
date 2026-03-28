"use client"

import { useEffect, useState } from 'react'
import { addDocument, fetchAllDocuments, deleteDocumentById, updateDocumentById } from '@/lib/firestoreApi'

export default function FirestoreDemo() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [ingredientsText, setIngredientsText] = useState('')
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await fetchAllDocuments()
      setDocs(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const ingredients = ingredientsText.split('\n').map((l) => l.trim()).filter(Boolean)
    try {
      await addDocument({ title, description, ingredients })
      setTitle('')
      setDescription('')
      setIngredientsText('')
      await load()
    } catch (err) {
      console.error(err)
      alert('Add failed')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this document?')) return
    try {
      await deleteDocumentById(id)
      await load()
    } catch (err) {
      console.error(err)
      alert('Delete failed')
    }
  }

  async function handleToggleTitle(id: string) {
    const doc = docs.find((d) => d.id === id)
    if (!doc) return
    try {
      await updateDocumentById(id, { title: doc.title + ' (edited)' })
      await load()
    } catch (err) {
      console.error(err)
      alert('Update failed')
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Firestore Demo (collection: &lt;YOUR_COLLECTION_NAME&gt;)</h3>
      <form onSubmit={handleAdd} className="space-y-2">
        <input required placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="border p-2 w-full" />
        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="border p-2 w-full" />
        <textarea placeholder="Ingredients (one per line)" value={ingredientsText} onChange={(e) => setIngredientsText(e.target.value)} className="border p-2 w-full" />
        <button type="submit" className="bg-primary text-white px-3 py-1">Add</button>
      </form>

      <div>
        <h4 className="font-semibold">Documents</h4>
        {loading ? <div>Loading...</div> : null}
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="border p-2 rounded">
              <div className="flex justify-between items-start">
                <div>
                  <strong>{d.title}</strong>
                  <div className="text-sm text-muted">{d.description}</div>
                  <div className="text-xs text-muted">Ingredients: {(d.ingredients || []).join(', ')}</div>
                </div>
                <div className="space-x-2">
                  <button onClick={() => handleToggleTitle(d.id)} className="text-sm px-2 py-1 border rounded">Edit title</button>
                  <button onClick={() => handleDelete(d.id)} className="text-sm px-2 py-1 border rounded">Delete</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
