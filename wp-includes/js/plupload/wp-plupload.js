/* global pluploadL10n, plupload, _wpPluploadSettings */

/**
 * @namespace wp
 */
window.wp = window.wp || {};

( function( exports, $ ) {
	var Uploader;

	if ( typeof _wpPluploadSettings === 'undefined' ) {
		return;
	}

	/**
	 * A WordPress uploader.
	 *
	 * The Plupload library provides cross-browser uploader UI integration.
	 * This object bridges the Plupload API to integrate uploads into the
	 * WordPress back end and the WordPress media experience.
	 *
	 * @class
	 * @memberOf wp
	 * @alias wp.Uploader
	 *
	 * @param {object} options           The options passed to the new plupload instance.
	 * @param {object} options.container The id of uploader container.
	 * @param {object} options.browser   The id of button to trigger the file select.
	 * @param {object} options.dropzone  The id of file drop target.
	 * @param {object} options.plupload  An object of parameters to pass to the plupload instance.
	 * @param {object} options.params    An object of parameters to pass to $_POST when uploading the file.
	 *                                   Extends this.plupload.multipart_params under the hood.
	 */
	Uploader = function( options ) {
		var self = this,
			isIE, // Not used, back-compat.
			elements = {
				container: 'container',
				browser:   'browse_button',
				dropzone:  'drop_element'
			},
			tryAgainCount = {},
			tryAgain,
			key,
			error,
			fileUploaded;

		this.supports = {
			upload: Uploader.browser.supported
		};

		this.supported = this.supports.upload;

		if ( ! this.supported ) {
			return;
		}

		// Arguments to send to pluplad.Uploader().
		// Use deep extend to ensure that multipart_params and other objects are cloned.
		this.plupload = $.extend( true, { multipart_params: {} }, Uploader.defaults );
		this.container = document.body; // Set default container.

		/*
		 * Extend the instance with options.
		 *
		 * Use deep extend to allow options.plupload to override individual
		 * default plupload keys.
		 */
		$.extend( true, this, options );

		// Proxy all methods so this always refers to the current instance.
		for ( key in this ) {
			if ( typeof this[ key ] === 'function' ) {
				this[ key ] = $.proxy( this[ key ], this );
			}
		}

		// Ensure all elements are jQuery elements and have id attributes,
		// then set the proper plupload arguments to the ids.
		for ( key in elements ) {
			if ( ! this[ key ] ) {
				continue;
			}

			this[ key ] = $( this[ key ] ).first();

			if ( ! this[ key ].length ) {
				delete this[ key ];
				continue;
			}

			if ( ! this[ key ].prop('id') ) {
				this[ key ].prop( 'id', '__wp-uploader-id-' + Uploader.uuid++ );
			}

			this.plupload[ elements[ key ] ] = this[ key ].prop('id');
		}

		// If the uploader has neither a browse button nor a dropzone, bail.
		if ( ! ( this.browser && this.browser.length ) && ! ( this.dropzone && this.dropzone.length ) ) {
			return;
		}

		// Initialize the plupload instance.
		this.uploader = new plupload.Uploader( this.plupload );
		delete this.plupload;

		// Set default params and remove this.params alias.
		this.param( this.params || {} );
		delete this.params;

		/**
		 * Attempt to create image sub-sizes when an image was uploaded successfully
		 * but the server responded with HTTP 5xx error.
		 *
		 * @since 5.3.0
		 *
		 * @param {string}        message Error message.
		 * @param {object}        data    Error data from Plupload.
		 * @param {plupload.File} file    File that was uploaded.
		 */
		tryAgain = function( message, data, file ) {
			var times, id;

			if ( ! data || ! data.responseHeaders ) {
				error( pluploadL10n.http_error_image, data, file, 'no-retry' );
				return;
			}

			id = data.responseHeaders.match( /x-wp-upload-attachment-id:\s*(\d+)/i );

			if ( id && id[1] ) {
				id = id[1];
			} else {
				error( pluploadL10n.http_error_image, data, file, 'no-retry' );
				return;
			}

			times = tryAgainCount[ file.id ];

			if ( times && times > 4 ) {
				/*
				 * The file may have been uploaded and attachment post created,
				 * but post-processing and resizing failed...
				 * Do a cleanup then tell the user to scale down the image and upload it again.
				 */
				$.ajax({
					type: 'post',
					url: ajaxurl,
					dataType: 'json',
					data: {
						action: 'media-create-image-subsizes',
						_wpnonce: _wpPluploadSettings.defaults.multipart_params._wpnonce,
						attachment_id: id,
						_wp_upload_failed_cleanup: true,
					}
				});

				error( message, data, file, 'no-retry' );
				return;
			}

			if ( ! times ) {
				tryAgainCount[ file.id ] = 1;
			} else {
				tryAgainCount[ file.id ] = ++times;
			}

			// Another request to try to create the missing image sub-sizes.
			$.ajax({
				type: 'post',
				url: ajaxurl,
				dataType: 'json',
				data: {
					action: 'media-create-image-subsizes',
					_wpnonce: _wpPluploadSettings.defaults.multipart_params._wpnonce,
					attachment_id: id,
				}
			}).done( function( response ) {
				if ( response.success ) {
					fileUploaded( self.uploader, file, response );
				} else {
					if ( response.data && response.data.message ) {
						message = response.data.message;
					}

					error( message, data, file, 'no-retry' );
				}
			}).fail( function( jqXHR ) {
				// If another HTTP 5xx error, try try again...
				if ( jqXHR.status >= 500 && jqXHR.status < 600 ) {
					tryAgain( message, data, file );
					return;
				}

				error( message, data, file, 'no-retry' );
			});
		}

		/**
		 * Custom error callback.
		 *
		 * Add a new error to the errors collection, so other modules can track
		 * and display errors. @see wp.Uploader.errors.
		 *
		 * @param {string}        message Error message.
		 * @param {object}        data    Error data from Plupload.
		 * @param {plupload.File} file    File that was uploaded.
		 * @param {string}        retry   Whether to try again to create image sub-sizes. Passing 'no-retry' will prevent it.
		 */
		error = function( message, data, file, retry ) {
			var isImage = file.type && file.type.indexOf( 'image/' ) === 0,
				status = data && data.status;

			// If the file is an image and the error is HTTP 5xx try to create sub-sizes again.
			if ( retry !== 'no-retry' && isImage && status >= 500 && status < 600 ) {
				tryAgain( message, data, file );
				return;
			}

			if ( file.attachment ) {
				file.attachment.destroy();
			}

			Uploader.errors.unshift({
				message: message || pluploadL10n.default_error,
				data:    data,
				file:    file
			});

			self.error( message, data, file );
		};

		/**
		 * After a file is successfully uploaded, update its model.
		 *
		 * @param {plupload.Uploader} up       Uploader instance.
		 * @param {plupload.File}     file     File that was uploaded.
		 * @param {Object}            response Object with response properties.
		 */
		fileUploaded = function( up, file, response ) {
			var complete;

			// Remove the "uploading" UI elements.
			_.each( ['file','loaded','size','percent'], function( key ) {
				file.attachment.unset( key );
			} );

			file.attachment.set( _.extend( response.data, { uploading: false } ) );

			wp.media.model.Attachment.get( response.data.id, file.attachment );

			complete = Uploader.queue.all( function( attachment ) {
				return ! attachment.get( 'uploading' );
			});

			if ( complete ) {
				Uploader.queue.reset();
			}

			self.success( file.attachment );
		}

		/**
		 * After the Uploader has been initialized, initialize some behaviors for the dropzone.
		 *
		 * @param {plupload.Uploader} uploader Uploader instance.
		 */
		this.uploader.bind( 'init', function( uploader ) {
			var timer, active, dragdrop,
				dropzone = self.dropzone;

			dragdrop = self.supports.dragdrop = uploader.features.dragdrop && ! Uploader.browser.mobile;

			// Generate drag/drop helper classes.
			if ( ! dropzone ) {
				return;
			}

			dropzone.toggleClass( 'supports-drag-drop', !! dragdrop );

			if ( ! dragdrop ) {
				return dropzone.unbind('.wp-uploader');
			}

			// 'dragenter' doesn't fire correctly, simulate it with a limited 'dragover'.
			dropzone.on( 'dragover.wp-uploader', function() {
				if ( timer ) {
					clearTimeout( timer );
				}

				if ( active ) {
					return;
				}

				dropzone.trigger('dropzone:enter').addClass('drag-over');
				active = true;
			});

			dropzone.on('dragleave.wp-uploader, drop.wp-uploader', function() {
				/*
				 * Using an instant timer prevents the drag-over class
				 * from being quickly removed and re-added when elements
				 * inside the dropzone are repositioned.
				 *
				 * @see https://core.trac.wordpress.org/ticket/21705
				 */
				timer = setTimeout( function() {
					active = false;
					dropzone.trigger('dropzone:leave').removeClass('drag-over');
				}, 0 );
			});

			self.ready = true;
			$(self).trigger( 'uploader:ready' );
		});

		this.uploader.bind( 'postinit', function( up ) {
			up.refresh();
			self.init();
		});

		this.uploader.init();

		if ( this.browser ) {
			this.browser.on( 'mouseenter', this.refresh );
		} else {
			this.uploader.disableBrowse( true );
		}

		$( self ).on( 'uploader:ready', function() {
			$( '.moxie-shim-html5 input[type="file"]' )
				.attr( {
					tabIndex:      '-1',
					'aria-hidden': 'true'
				} );
		} );

		/**
		 * After files were filtered and added to the queue, create a model for each.
		 *
		 * @param {plupload.Uploader} up    Uploader instance.
		 * @param {Array}             files Array of file objects that were added to queue by the user.
		 */
		this.uploader.bind( 'FilesAdded', function( up, files ) {
			_.each( files, function( file ) {
				var attributes, image;

				// Ignore failed uploads.
				if ( plupload.FAILED === file.status ) {
					return;
				}

				if ( file.type === 'image/heic' && up.settings.heic_upload_error ) {
					// Show error but do not block uploading.
					Uploader.errors.unshift({
						message: pluploadL10n.unsupported_image,
						data:    {},
						file:    file
					});
				} else if ( file.type === 'image/webp' && up.settings.webp_upload_error ) {
					// Disallow uploading of WebP images if the server cannot edit them.
					error( pluploadL10n.noneditable_image, {}, file, 'no-retry' );
					up.removeFile( file );
					return;
				} else if ( file.type === 'image/avif' && up.settings.avif_upload_error ) {
					// Disallow uploading of AVIF images if the server cannot edit them.
					error( pluploadL10n.noneditable_image, {}, file, 'no-retry' );
					up.removeFile( file );
					return;
				}

				// Generate attributes for a new `Attachment` model.
				attributes = _.extend({
					file:      file,
					uploading: true,
					date:      new Date(),
					filename:  file.name,
					menuOrder: 0,
					uploadedTo: wp.media.model.settings.post.id
				}, _.pick( file, 'loaded', 'size', 'percent' ) );

				// Handle early mime type scanning for images.
				image = /(?:jpe?g|png|gif)$/i.exec( file.name );

				// For images set the model's type and subtype attributes.
				if ( image ) {
					attributes.type = 'image';

					// `jpeg`, `png` and `gif` are valid subtypes.
					// `jpg` is not, so map it to `jpeg`.
					attributes.subtype = ( 'jpg' === image[0] ) ? 'jpeg' : image[0];
				}

				// Create a model for the attachment, and add it to the Upload queue collection
				// so listeners to the upload queue can track and display upload progress.
				file.attachment = wp.media.model.Attachment.create( attributes );
				Uploader.queue.add( file.attachment );

				self.added( file.attachment );
			});

			up.refresh();
			up.start();
		});

		this.uploader.bind( 'UploadProgress', function( up, file ) {
			file.attachment.set( _.pick( file, 'loaded', 'percent' ) );
			self.progress( file.attachment );
		});

		/**
		 * After a file is successfully uploaded, update its model.
		 *
		 * @param {plupload.Uploader} up       Uploader instance.
		 * @param {plupload.File}     file     File that was uploaded.
		 * @param {Object}            response Object with response properties.
		 * @return {mixed}
		 */
		this.uploader.bind( 'FileUploaded', function( up, file, response ) {

			try {
				response = JSON.parse( response.response );
			} catch ( e ) {
				return error( pluploadL10n.default_error, e, file );
			}

			if ( ! _.isObject( response ) || _.isUndefined( response.success ) ) {
				return error( pluploadL10n.default_error, null, file );
			} else if ( ! response.success ) {
				return error( response.data && response.data.message, response.data, file );
			}

			// Success. Update the UI with the new attachment.
			fileUploaded( up, file, response );
		});

		/**
		 * When plupload surfaces an error, send it to the error handler.
		 *
		 * @param {plupload.Uploader} up            Uploader instance.
		 * @param {Object}            pluploadError Contains code, message and sometimes file and other details.
		 */
		this.uploader.bind( 'Error', function( up, pluploadError ) {
			var message = pluploadL10n.default_error,
				key;

			// Check for plupload errors.
			for ( key in Uploader.errorMap ) {
				if ( pluploadError.code === plupload[ key ] ) {
					message = Uploader.errorMap[ key ];

					if ( typeof message === 'function' ) {
						message = message( pluploadError.file, pluploadError );
					}

					break;
				}
			}

			error( message, pluploadError, pluploadError.file );
			up.refresh();
		});

	};

	// Adds the 'defaults' and 'browser' properties.
	$.extend( Uploader, _wpPluploadSettings );

	Uploader.uuid = 0;

	// Map Plupload error codes to user friendly error messages.
	Uploader.errorMap = {
		'FAILED':                 pluploadL10n.upload_failed,
		'FILE_EXTENSION_ERROR':   pluploadL10n.invalid_filetype,
		'IMAGE_FORMAT_ERROR':     pluploadL10n.not_an_image,
		'IMAGE_MEMORY_ERROR':     pluploadL10n.image_memory_exceeded,
		'IMAGE_DIMENSIONS_ERROR': pluploadL10n.image_dimensions_exceeded,
		'GENERIC_ERROR':          pluploadL10n.upload_failed,
		'IO_ERROR':               pluploadL10n.io_error,
		'SECURITY_ERROR':         pluploadL10n.security_error,

		'FILE_SIZE_ERROR': function( file ) {
			return pluploadL10n.file_exceeds_size_limit.replace( '%s', file.name );
		},

		'HTTP_ERROR': function( file ) {
			if ( file.type && file.type.indexOf( 'image/' ) === 0 ) {
				return pluploadL10n.http_error_image;
			}

			return pluploadL10n.http_error;
		},
	};

	$.extend( Uploader.prototype, /** @lends wp.Uploader.prototype */{
		/**
		 * Acts as a shortcut to extending the uploader's multipart_params object.
		 *
		 * param( key )
		 *    Returns the value of the key.
		 *
		 * param( key, value )
		 *    Sets the value of a key.
		 *
		 * param( map )
		 *    Sets values for a map of data.
		 */
		param: function( key, value ) {
			if ( arguments.length === 1 && typeof key === 'string' ) {
				return this.uploader.settings.multipart_params[ key ];
			}

			if ( arguments.length > 1 ) {
				this.uploader.settings.multipart_params[ key ] = value;
			} else {
				$.extend( this.uploader.settings.multipart_params, key );
			}
		},

		/**
		 * Make a few internal event callbacks available on the wp.Uploader object
		 * to change the Uploader internals if absolutely necessary.
		 */
		init:     function() {},
		error:    function() {},
		success:  function() {},
		added:    function() {},
		progress: function() {},
		complete: function() {},
		refresh:  function() {
			var node, attached, container, id;

			if ( this.browser ) {
				node = this.browser[0];

				// Check if the browser node is in the DOM.
				while ( node ) {
					if ( node === document.body ) {
						attached = true;
						break;
					}
					node = node.parentNode;
				}

				/*
				 * If the browser node is not attached to the DOM,
				 * use a temporary container to house it, as the browser button shims
				 * require the button to exist in the DOM at all times.
				 */
				if ( ! attached ) {
					id = 'wp-uploader-browser-' + this.uploader.id;

					container = $( '#' + id );
					if ( ! container.length ) {
						container = $('<div class="wp-uploader-browser" />').css({
							position: 'fixed',
							top: '-1000px',
							left: '-1000px',
							height: 0,
							width: 0
						}).attr( 'id', 'wp-uploader-browser-' + this.uploader.id ).appendTo('body');
					}

					container.append( this.browser );
				}
			}

			this.uploader.refresh();
		}
	});

	// Create a collection of attachments in the upload queue,
	// so that other modules can track and display upload progress.
	Uploader.queue = new wp.media.model.Attachments( [], { query: false });

	// Create a collection to collect errors incurred while attempting upload.
	Uploader.errors = new Backbone.Collection();

	exports.Uploader = Uploader;
})( wp, jQuery );