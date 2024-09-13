import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import './Admin.css';
import { Button, Form } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

function Admin() {
    document.title = "BXHbaihat";
    const [songs, setSongs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [newSongFile, setNewSongFile] = useState(null);
    const [, setHubConnection] = useState(null);

    useEffect(() => {
        const token = document.cookie
            .split('; ')
            .find(row => row.startsWith('token='))
            ?.split('=')[1];

        if (!token) {
            alert("Bạn cần đăng nhập để truy cập trang này.");
            document.location = "/login";
            return;
        }

        const connection = new signalR.HubConnectionBuilder()
            .withUrl("https://localhost:7239/songHub", {
                withCredentials: true
            })
            .build();

        connection.start()
            .then(() => console.log("Connected to SignalR Hub"))
            .catch(err => console.log("Error while starting connection: " + err));

        connection.on("ReceiveLikeUpdate", (songId, likes) => {
            setSongs(prevSongs => {
                return prevSongs.map(song =>
                    song.id === songId ? { ...song, likes } : song
                );
            });
        });

        setHubConnection(connection);

        // Fetch danh sách bài hát
        fetch("https://localhost:7239/api/SecureWebsite/songs", {
            method: "GET",
            credentials: "include",
            headers: {
                "Authorization": `Bearer ${token}`, // Gửi token
                "Content-Type": "application/json",
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Error fetching songs: " + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                setSongs(data);
            })
            .catch(error => {
                console.log("Error fetching songs: ", error);
                alert("Đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.");
                document.location = "/login"; // Chuyển hướng về trang đăng nhập
            });

        return () => {
            connection.stop();
        };
    }, []);

    const handleSearch = (event) => {
        setSearchTerm(event.target.value);
    };

    const addSong = () => {
        if (newSongFile) {
            const formData = new FormData();
            formData.append('file', newSongFile);
            formData.append('Name', newSongFile.name);

            fetch("api/SecureWebsite/songs", {
                method: "POST",
                body: formData,
                credentials: "include",
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error("Network response was not ok");
                    }
                    return response.json();
                })
                .then(data => {
                    setSongs([...songs, data.song]);
                    setNewSongFile(null);
                })
                .catch(error => {
                    console.log("Error adding song: ", error);
                });
        }
    };

    const createHeartEffect = (event) => {
        const heart = document.createElement('span');
        heart.className = 'heart';
        heart.innerHTML = '❤️';
        document.body.appendChild(heart);

        const { clientX, clientY } = event;
        heart.style.left = `${clientX}px`;
        heart.style.top = `${clientY}px`;

        setTimeout(() => {
            heart.remove();
        }, 1000);
    };

    const likeSong = async (songId, event) => {
        const songToLike = songs.find(song => song.id === songId);
        const updatedSongs = songs.map(song =>
            song.id === songId ? { ...song, likes: song.likes + 1 } : song
        );

        setSongs(updatedSongs);
        createHeartEffect(event);

        try {
            const response = await fetch(`api/SecureWebsite/songs/${songToLike.id}/like`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${document.cookie.split('; ').find(row => row.startsWith('token=')).split('=')[1]}` // Gửi token
                },
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
        } catch (error) {
            console.error("Error updating likes: ", error);
            const revertedSongs = updatedSongs.map(song =>
                song.id === songId ? { ...song, likes: song.likes - 1 } : song
            );
            setSongs(revertedSongs);
        }
    };

    const filteredSongs = songs.filter(song =>
        song.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => b.likes - a.likes);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setNewSongFile(file);
        }
    };

    return (
        <section className='admin-page page'>
            <header>
                <h1>BXH Bài Hát Yêu Thích</h1>
                <input
                    type="text"
                    placeholder="Tìm kiếm bài hát..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="search-input"
                />
                <div className="add-song">
                    <Form>
                        <Form.Group controlId="formFile" className="mb-3">
                            <Form.Control type="file" accept="audio/mp3" onChange={handleFileChange} />
                        </Form.Group>
                        <Button onClick={addSong}>Thêm</Button>
                    </Form>
                </div>
            </header>
            <section>
                {
                    filteredSongs.length > 0 ?
                        <ul className="song-list">
                            {filteredSongs.map((song) => {
                                const decodedFileName = decodeURIComponent(song.name);
                                return (
                                    <li key={song.id}>
                                        <span className="song-name">{decodedFileName}</span>
                                        <div className="song-actions">
                                            <span className="like-button" onClick={(event) => likeSong(song.id, event)}>❤️ {song.likes}</span>
                                            <audio controls>
                                                <source src={song.url} type="audio/mpeg" />
                                                Your browser does not support the audio tag.
                                            </audio>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                        :
                        <div className='waiting-page'>
                            <div>Không tìm thấy bài hát nào...</div>
                        </div>
                }
            </section>
        </section>
    );
}

export default Admin;