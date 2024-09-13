import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr'; // Nhập thư viện SignalR
import './Admin.css'; // Nhập file CSS cho giao diện
import 'bootstrap/dist/css/bootstrap.min.css';

function Homepage() {
    document.title = "BXHbaihat";
    const [songs, setSongs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [, setHubConnection] = useState(null); // Thêm state cho SignalR

    useEffect(() => {
        const connection = new signalR.HubConnectionBuilder()
            .withUrl("https://localhost:7239/songHub", {
                withCredentials: true // Nếu cần gửi thông tin xác thực
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
            credentials: "include"
        }).then(response => response.json()).then(data => {
            setSongs(data); // Cập nhật danh sách bài hát
        }).catch(error => {
            console.log("Error fetching songs: ", error);
        });

        return () => {
            connection.stop();
        };
    }, []);

    const handleSearch = (event) => {
        setSearchTerm(event.target.value);
    };



    const createHeartEffect = (event) => {
        const heart = document.createElement('span');
        heart.className = 'heart';
        heart.innerHTML = '❤️'; // Trái tim
        document.body.appendChild(heart);

        // Lấy vị trí click
        const { clientX, clientY } = event;
        heart.style.left = `${clientX}px`;
        heart.style.top = `${clientY}px`;

        // Xóa trái tim sau khi hoàn tất hiệu ứng
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
export default Homepage;