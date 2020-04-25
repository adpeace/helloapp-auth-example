import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';
import { GoogleLogin } from 'react-google-login';
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';

import axios from 'axios';

const useStyles = makeStyles(theme => ({
    content: {
        textAlign: "center",
        marginTop: 40,
    },
}));


export function Login(props) {
    const classes = useStyles();
    const [loginError, setLoginError] = useState(false);

    function loginSuccess(d) {
        // Log into backend with the ID token as credential:
        async function complete_auth() {
            var formData = new FormData();
            formData.set("id_token", d.tokenObj.id_token);
            try {
                await axios.post('/me', formData);
                props.setAuthRequired(false);
            } catch(e) {
                setLoginError(true);
            }
        }

        complete_auth();
    };
    function loginFailure(d) {
        setLoginError(true);
    };

    // Redirect if authentication is done:
    if (!props.authRequired)
        return <Redirect to="/" />;

    return (
        <div className={classes.content}>
            <Typography
                variant="h5"
                gutterBottom={true}
                >Please log in to use the Hello app.</Typography>
            <GoogleLogin
                clientId="752350466610-gce0q11es3ap63hg0vn42p84p184pf0g.apps.googleusercontent.com"
                buttonText="Log in with Google"
                onSuccess={loginSuccess}
                onFailure={loginFailure}
                cookiePolicy={"single_host_origin"}
                redirectUri="postmessage"
                scope="openid"
            />
            <Snackbar open={loginError} autoHideDuration={10000} onClose={() => setLoginError(false)}>
                <Alert elevation={6} severity="error" variant="filled">Error logging in</Alert>
            </Snackbar>
        </div>
    );
};