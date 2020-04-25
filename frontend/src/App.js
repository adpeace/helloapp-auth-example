/* React imports */
import React, { useEffect, useState } from 'react';
import './App.css';
import { HashRouter, Switch, Route }
    from 'react-router-dom';
import { Redirect } from 'react-router-dom';
import { makeStyles } from '@material-ui/core/styles';

/* Material UI imports */
import CssBaseline from '@material-ui/core/CssBaseline';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar'
import Typography from '@material-ui/core/Typography';
import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';

/* Other libraries */
import axios from 'axios';

/* Application imports */
import { ProfileButton } from "./ProfileButton";
import { Login } from './Login';
import { Hello } from './Hello';


axios.defaults.headers.common['X-Requested-With'] = 'XmlHttpRequest'

const useStyles = makeStyles(theme => ({
    title: {
        flexGrow: 1,
    }
}));

const ProtectedRoute = ({children, authRequired, ...rest}) => {
    return (
        <Route {...rest}>
            {!authRequired ? children : <Redirect to="/login" />}
        </Route>
    );
};

function App(props) {
    const classes = useStyles();

    /* Is authentication required? */
    const [authRequired, setAuthRequired] = useState(false);
    const [profilePicture, setProfilePicture] = useState(null);
    const [logoutError, showLogoutError] = useState(false);

    /* For logout  */
    function handleLogout() {
        async function do_logout() {
            try {
                const result = await axios.delete('/me');
                if (result.status === 200 || result.status === 204) {
                    setAuthRequired(true);
                }
            } catch(e) {
                showLogoutError(true);
            }
        }
        do_logout();
    }

    useEffect(() => {
        async function fetchData() {
            if (!authRequired) {
                try {
                    const r = await axios.get('/me');
                    setProfilePicture(r.data.picture);
                } catch(e) {
                    if (e.response) {
                        if (e.response.status === 401) {
                            setAuthRequired(true);
                        }
                    }
                }
            } else {
                setProfilePicture(null);
            }
        };

        fetchData();
    }, [authRequired]);

    return (
        <>
            <CssBaseline />

            <AppBar position="static">
                <Toolbar>
                    <Typography color="inherit" variant="h6" className={classes.title}>
                        The Hello App
                    </Typography>
                    <ProfileButton
                        handleLogout={handleLogout}
                        authenticated={!authRequired}
                        profilePicture={profilePicture}
                        />
                </Toolbar>
            </AppBar>

            <HashRouter>
                <Switch>
                    <Route path="/login">
                        <Login
                            authRequired={authRequired} setAuthRequired={setAuthRequired}
                            clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}
                            />
                    </Route>
                    <ProtectedRoute authRequired={authRequired} path="/">
                        <Hello setAuthRequired={setAuthRequired} />
                    </ProtectedRoute>
                </Switch>
            </HashRouter>

            <Snackbar
                open={logoutError}
                autoHideDuration={10000}
                onClose={() => showLogoutError(false)}
                >
                <Alert variant="filled" elevated={6} severity="error">
                    Couldn't log out
                </Alert>
            </Snackbar>
        </>
    );
}

export default App;
