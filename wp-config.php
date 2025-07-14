<?php
define( 'WP_CACHE', true );

/**
 * The base configuration for WordPress
 *
 * The wp-config.php creation script uses this file during the installation.
 * You don't have to use the web site, you can copy this file to "wp-config.php"
 * and fill in the values.
 *
 * This file contains the following configurations:
 *
 * * Database settings
 * * Secret keys
 * * Database table prefix
 * * Localized language
 * * ABSPATH
 *
 * @link https://wordpress.org/support/article/editing-wp-config-php/
 *
 * @package WordPress
 */
// ** Database settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define( 'DB_NAME', 'u744719588_BqakH' );
/** Database username */
define( 'DB_USER', 'u744719588_MqruN' );
/** Database password */
define( 'DB_PASSWORD', 'JgDav0Re8J' );
/** Database hostname */
define( 'DB_HOST', '127.0.0.1' );
/** Database charset to use in creating database tables. */
define( 'DB_CHARSET', 'utf8' );
/** The database collate type. Don't change this if in doubt. */
define( 'DB_COLLATE', '' );
/**#@+
 * Authentication unique keys and salts.
 *
 * Change these to different unique phrases! You can generate these using
 * the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}.
 *
 * You can change these at any point in time to invalidate all existing cookies.
 * This will force all users to have to log in again.
 *
 * @since 2.6.0
 */
define( 'AUTH_KEY',          'D8R:W {GY<8(Fs|e?^}#IjbY`wh,@T=En;a&9,a|FatP;,x5y3em&Zj_?^j:6A/y' );
define( 'SECURE_AUTH_KEY',   '77D2luu4bymj{9 Q4*@>y;[}|?3W74L(ewECWmFkD6=&[0Qc`!E&uiq^WLC:?0qD' );
define( 'LOGGED_IN_KEY',     'ot9zFg(CM>u:OQsssUy>F(dihESUl#Si><6]NJ8H!/T3Gl -^b-g4:%AMy ZauG9' );
define( 'NONCE_KEY',         '!y#UAfJdxNy%$QY@5wu2%)Xb[+;]#4C`bY.V[L+9K%vV0Eu?R1gk;MC&} a_$jKN' );
define( 'AUTH_SALT',         ')zx|u/wV]6]4_ie|ix{N0B7[`H!VZphN%G%QCM^C:=17/%6u#~ 9rWyNj=rcJ^~;' );
define( 'SECURE_AUTH_SALT',  '6fb74tF+1W-0|$1b7(O %RO[yQezp&/}[0Sv%]OlPLoO|%pAQ_4[M*Pg#L:S@clN' );
define( 'LOGGED_IN_SALT',    'sE<y2/hPcD,2!;41:?`~zr~A>E6gkKvUnv }in,)-Y1R.LsC[zz;VXF|*9&nACg*' );
define( 'NONCE_SALT',        'I!AD|fSfv9D!@<>]3a:sKSn0KHwQ&KUj_8r&O6^N8`,B^egDT`Q/BxYfHWFb>6wb' );
define( 'WP_CACHE_KEY_SALT', 'Z?&Ha!fq;:FSq)_N74cGUUs7-1=*Rtp}{yGa8XCTi!$NGmxo;ZNvGKTb.:K/Mqb%' );
/**#@-*/
/**
 * WordPress database table prefix.
 *
 * You can have multiple installations in one database if you give each
 * a unique prefix. Only numbers, letters, and underscores please!
 */
$table_prefix = 'wp_';
/* Add any custom values between this line and the "stop editing" line. */
/**
 * For developers: WordPress debugging mode.
 *
 * Change this to true to enable the display of notices during development.
 * It is strongly recommended that plugin and theme developers use WP_DEBUG
 * in their development environments.
 *
 * For information on other constants that can be used for debugging,
 * visit the documentation.
 *
 * @link https://wordpress.org/support/article/debugging-in-wordpress/
 */
if ( ! defined( 'WP_DEBUG' ) ) {
	define( 'WP_DEBUG', false );
}
define( 'FS_METHOD', 'direct' );
define( 'COOKIEHASH', '72c440c686b6e085648bcd6e79114fc6' );
define( 'WP_AUTO_UPDATE_CORE', false );
define( 'WP_DEBUG_LOG', false );
define( 'WP_DEBUG_DISPLAY', false );
/* That's all, stop editing! Happy publishing. */
/** Absolute path to the WordPress directory. */
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}
/** Sets up WordPress vars and included files. */
require_once ABSPATH . 'wp-settings.php';