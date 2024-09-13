import { useEffect, useState } from 'react';

function Home() {
    document.title = "Welcome";
    const [userInfo, setUserInfo] = useState({});

    useEffect(() => {
        const user = getCookie("user");
        fetch("api/SecureWebsite/home/" + user, {
            method: "GET",
            credentials: "include"
        }).then(response => response.json()).then(data => {
            setUserInfo(data.userInfo);
            console.log("user info: ", data.userInfo);
        }).catch(error => {
            console.log("Error home page: ", error);
        });
    }, []);

    // Hàm để lấy giá trị từ Cookies
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    return (
        <section className='page'>
            <header>
                <h1>Welcome to your page</h1>
            </header>
            {
                userInfo ?
                    <div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Created Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>{userInfo.name}</td>
                                    <td>{userInfo.email}</td>
                                    <td>{userInfo.createdDate ? userInfo.createdDate.split("T")[0] : ""}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div> :
                    <div className='warning'>
                        <div>Access Denied!!!</div>
                    </div>
            }
        </section>
    );
}

export default Home;