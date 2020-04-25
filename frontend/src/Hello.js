import React, { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';

import axios from 'axios';

const useStyles = makeStyles(theme => ({
    content: {
        textAlign: "center",
        marginTop: 40,
    },
}));


export function Hello(props) {
    const [name, setName] = useState("");
    const [sub, setSub] = useState("");
    const classes = useStyles();
    const [authRequired, setAuthRequired] = [props.authRequired, props.setAuthRequired];
    useEffect(() => {
        async function fetchData() {
            try {
                const r = await axios.get('/me');
                setName(r.data.name);
                setSub(r.data.google_id);
            } catch(e) {
                console.log(e);
                if (e.response) {
                    if (e.response.status === 401) {
                        setAuthRequired(true);
                    }
                }
            }
        };

        fetchData();
    }, [authRequired, setAuthRequired]);

    if (name && sub)
        return (
            <div className={classes.content}>
                <Typography variant="h4">
                    Hello, {name}
                </Typography>
                <Typography variant="body1">
                    Click your profile picture to log out.
                </Typography>
                <Typography variant="body1">
                    Google subscriber ID: {sub}.
                </Typography>
            </div>
        );
    else
        return (
            <div className={classes.content}>
                <Typography  variant="h5">
                    Loading...
                </Typography>
            </div>
        );
}