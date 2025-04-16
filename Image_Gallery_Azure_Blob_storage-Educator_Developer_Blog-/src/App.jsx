import { useEffect, useState } from 'react'
import './App.css'
import { AiFillDelete } from 'react-icons/ai'
import { FaFileUpload, FaSun, FaMoon } from 'react-icons/fa'
import Placeholder from './assets/placeholder.jpeg'
import Loading from './components/Loading'
import { BlobServiceClient } from '@azure/storage-blob'
import { motion } from 'framer-motion'

const App = () => {
  const [file, setFile] = useState(null)
  const [fileType, setFileType] = useState('')
  const [fileUrls, setFileUrls] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [darkMode, setDarkMode] = useState(false)

  const account = import.meta.env.VITE_STORAGE_ACCOUNT
  const sasToken = import.meta.env.VITE_STORAGE_SAS
  const containerName = import.meta.env.VITE_STORAGE_CONTAINER

  const blobServiceClient = new BlobServiceClient(`https://${account}.blob.core.windows.net/?${sasToken}`)
  const containerClient = blobServiceClient.getContainerClient(containerName)

  const fetchFiles = async () => {
    try {
      setLoading(true)
      const urls = []
      for await (const blob of containerClient.listBlobsFlat()) {
        const blobClient = containerClient.getBlockBlobClient(blob.name)
        urls.push({
          name: blob.name,
          url: blobClient.url,
          type: blob.properties.contentType || 'application/octet-stream',
        })
      }
      setFileUrls(urls)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file || !fileType) return alert('Please select a file type and file to upload')
    try {
      setLoading(true)
      const blobName = `${Date.now()}-${file.name}`
      const blobClient = containerClient.getBlockBlobClient(blobName)
      await blobClient.uploadData(file, {
        blobHTTPHeaders: { blobContentType: file.type }
      })
      await fetchFiles()
      setFile(null)
      setFileType('')
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (blobName) => {
    try {
      setLoading(true)
      const blobClient = containerClient.getBlockBlobClient(blobName)
      await blobClient.delete()
      await fetchFiles()
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  const getFileType = (type) => {
    if (type.startsWith('image/')) return 'image'
    if (type.startsWith('video/')) return 'video'
    if (type.startsWith('audio/')) return 'audio'
    return 'other'
  }

  const getFileNameWithoutExtension = (filename) => {
    const dotIndex = filename.lastIndexOf('.')
    return dotIndex !== -1 ? filename.slice(0, dotIndex) : filename
  }

  const filteredFiles = filter === 'all' ? fileUrls : fileUrls.filter(f => getFileType(f.type) === filter)

  return (
    <div className={`container ${darkMode ? 'dark' : ''}`}>
      {loading && <Loading />}
      <header className="header">
        <h2>🎥 Media Gallery with Azure Blob Storage 🎧</h2>
        <div className="auth-btns">
          <button className="login-btn">Login</button>
          <button className="signup-btn">Sign Up</button>
          <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>
        </div>
      </header>

      <div className="filter-row">
        <label>Filter by type:</label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="audio">Audios</option>
        </select>
      </div>

      <form className="upload-form" onSubmit={handleSubmit}>
        {['image', 'video', 'audio'].map((type) => (
          <div className="upload-section" key={type}>
            <h3>{type === 'image' ? '🖼️' : type === 'video' ? '🎥' : '🎧'} Upload {type.charAt(0).toUpperCase() + type.slice(1)}</h3>
            <div className="upload-preview">
              {file && fileType === type ? (
                type === 'image' ? (
                  <img src={URL.createObjectURL(file)} className="displayImg" />
                ) : type === 'video' ? (
                  <video src={URL.createObjectURL(file)} controls className="displayImg" />
                ) : (
                  <audio src={URL.createObjectURL(file)} controls className="displayImg" />
                )
              ) : (
                <img src={Placeholder} className="displayImg" />
              )}
            </div>
            <label htmlFor={`${type}Upload`} className="upload-btn"><FaFileUpload /> Select {type}</label>
            <input id={`${type}Upload`} type="file" accept={`${type}/*`} style={{ display: 'none' }} onChange={(e) => { setFile(e.target.files[0]); setFileType(type) }} />
          </div>
        ))}
        <button type="submit" className="upload-action">🚀 Upload</button>
      </form>

      <div className="row-display">
        {filteredFiles.length === 0 ? <h3>😐 No Files Found 😐</h3> : (
          filteredFiles.map((blobItem, index) => {
            const type = getFileType(blobItem.type)
            return (
              <motion.div
                key={index}
                className="card"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {type === 'image' && <img src={blobItem.url} alt="media" />}
                {type === 'video' && <video src={blobItem.url} controls />}
                {type === 'audio' && <audio src={blobItem.url} controls />}
                <h3>{getFileNameWithoutExtension(blobItem.name)}</h3>
                <a href={blobItem.url} download target="_blank" rel="noreferrer">
                  <button className="del download-btn">Download</button>
                </a>
                <button className="del" onClick={() => handleDelete(blobItem.name)}> <AiFillDelete /> </button>
              </motion.div>
            )
          })
        )}
      </div>

      <footer>
        <p>© 2025 Jaideep Singh | Contact: jaideep@example.com</p>
        <div className="social-icons">
          <a href="#"><i className="fab fa-facebook-f"></i></a>
          <a href="#"><i className="fab fa-twitter"></i></a>
          <a href="#"><i className="fab fa-instagram"></i></a>
        </div>
      </footer>
    </div>
  )
}

export default App
