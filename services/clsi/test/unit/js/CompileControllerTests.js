const SandboxedModule = require('sandboxed-module')
const sinon = require('sinon')
const { expect } = require('chai')
const modulePath = require('path').join(
  __dirname,
  '../../../app/js/CompileController'
)
const Errors = require('../../../app/js/Errors')

function tryImageNameValidation(method, imageNameField) {
  describe('when allowedImages is set', function () {
    beforeEach(function () {
      this.Settings.clsi = { docker: {} }
      this.Settings.clsi.docker.allowedImages = [
        'repo/image:tag1',
        'repo/image:tag2',
      ]
      this.res.send = sinon.stub()
      this.res.status = sinon.stub().returns({ send: this.res.send })

      this.CompileManager[method].reset()
    })

    describe('with an invalid image', function () {
      beforeEach(function () {
        this.req.query[imageNameField] = 'something/evil:1337'
        this.CompileController[method](this.req, this.res, this.next)
      })
      it('should return a 400', function () {
        expect(this.res.status.calledWith(400)).to.equal(true)
      })
      it('should not run the query', function () {
        expect(this.CompileManager[method].called).to.equal(false)
      })
    })

    describe('with a valid image', function () {
      beforeEach(function () {
        this.req.query[imageNameField] = 'repo/image:tag1'
        this.CompileController[method](this.req, this.res, this.next)
      })
      it('should not return a 400', function () {
        expect(this.res.status.calledWith(400)).to.equal(false)
      })
      it('should run the query', function () {
        expect(this.CompileManager[method].called).to.equal(true)
      })
    })
  })
}

describe('CompileController', function () {
  beforeEach(function () {
    this.buildId = 'build-id-123'
    this.CompileController = SandboxedModule.require(modulePath, {
      requires: {
        './CompileManager': (this.CompileManager = {}),
        './RequestParser': (this.RequestParser = {}),
        '@overleaf/settings': (this.Settings = {
          apis: {
            clsi: {
              url: 'http://clsi.example.com',
              outputUrlPrefix: '/zone/b',
            },
          },
        }),
        '@overleaf/metrics': {
          Timer: sinon.stub().returns({ done: sinon.stub() }),
        },
        './ProjectPersistenceManager': (this.ProjectPersistenceManager = {}),
        './Errors': (this.Erros = Errors),
      },
    })
    this.Settings.externalUrl = 'http://www.example.com'
    this.req = {}
    this.res = {}
    this.next = sinon.stub()
  })

  describe('compile', function () {
    beforeEach(function () {
      this.req.body = {
        compile: 'mock-body',
      }
      this.req.params = { project_id: (this.project_id = 'project-id-123') }
      this.request = {
        compile: 'mock-parsed-request',
      }
      this.request_with_project_id = {
        compile: this.request.compile,
        project_id: this.project_id,
      }
      this.output_files = [
        {
          path: 'output.pdf',
          type: 'pdf',
          size: 1337,
          build: 1234,
        },
        {
          path: 'output.log',
          type: 'log',
          build: 1234,
        },
      ]
      this.RequestParser.parse = sinon
        .stub()
        .callsArgWith(1, null, this.request)
      this.ProjectPersistenceManager.markProjectAsJustAccessed = sinon
        .stub()
        .callsArg(1)
      this.stats = { foo: 1 }
      this.timings = { bar: 2 }
      this.res.status = sinon.stub().returnsThis()
      this.res.send = sinon.stub()
    })

    describe('successfully', function () {
      beforeEach(function () {
        this.CompileManager.doCompileWithLock = sinon.stub().yields(null, {
          outputFiles: this.output_files,
          stats: this.stats,
          timings: this.timings,
          buildId: this.buildId,
        })
        this.CompileController.compile(this.req, this.res)
      })

      it('should parse the request', function () {
        this.RequestParser.parse.calledWith(this.req.body).should.equal(true)
      })

      it('should run the compile for the specified project', function () {
        this.CompileManager.doCompileWithLock
          .calledWith(this.request_with_project_id)
          .should.equal(true)
      })

      it('should mark the project as accessed', function () {
        this.ProjectPersistenceManager.markProjectAsJustAccessed
          .calledWith(this.project_id)
          .should.equal(true)
      })

      it('should return the JSON response', function () {
        this.res.status.calledWith(200).should.equal(true)
        this.res.send
          .calledWith({
            compile: {
              status: 'success',
              error: null,
              stats: this.stats,
              timings: this.timings,
              buildId: this.buildId,
              outputUrlPrefix: '/zone/b',
              outputFiles: this.output_files.map(file => ({
                url: `${this.Settings.apis.clsi.url}/project/${this.project_id}/build/${file.build}/output/${file.path}`,
                ...file,
              })),
            },
          })
          .should.equal(true)
      })
    })

    describe('without a outputUrlPrefix', function () {
      beforeEach(function () {
        this.Settings.apis.clsi.outputUrlPrefix = ''
        this.CompileManager.doCompileWithLock = sinon.stub().yields(null, {
          outputFiles: this.output_files,
          stats: this.stats,
          timings: this.timings,
          buildId: this.buildId,
        })
        this.CompileController.compile(this.req, this.res)
      })

      it('should return the JSON response with empty outputUrlPrefix', function () {
        this.res.status.calledWith(200).should.equal(true)
        this.res.send
          .calledWith({
            compile: {
              status: 'success',
              error: null,
              stats: this.stats,
              timings: this.timings,
              buildId: this.buildId,
              outputUrlPrefix: '',
              outputFiles: this.output_files.map(file => ({
                url: `${this.Settings.apis.clsi.url}/project/${this.project_id}/build/${file.build}/output/${file.path}`,
                ...file,
              })),
            },
          })
          .should.equal(true)
      })
    })

    describe('with user provided fake_output.pdf', function () {
      beforeEach(function () {
        this.output_files = [
          {
            path: 'fake_output.pdf',
            type: 'pdf',
            build: 1234,
          },
          {
            path: 'output.log',
            type: 'log',
            build: 1234,
          },
        ]
        this.CompileManager.doCompileWithLock = sinon.stub().yields(null, {
          outputFiles: this.output_files,
          stats: this.stats,
          timings: this.timings,
          buildId: this.buildId,
        })
        this.CompileController.compile(this.req, this.res)
      })

      it('should return the JSON response with status failure', function () {
        this.res.status.calledWith(200).should.equal(true)
        this.res.send
          .calledWith({
            compile: {
              status: 'failure',
              error: null,
              stats: this.stats,
              timings: this.timings,
              outputUrlPrefix: '/zone/b',
              buildId: this.buildId,
              outputFiles: this.output_files.map(file => ({
                url: `${this.Settings.apis.clsi.url}/project/${this.project_id}/build/${file.build}/output/${file.path}`,
                ...file,
              })),
            },
          })
          .should.equal(true)
      })
    })

    describe('with an empty output.pdf', function () {
      beforeEach(function () {
        this.output_files = [
          {
            path: 'output.pdf',
            type: 'pdf',
            size: 0,
            build: 1234,
          },
          {
            path: 'output.log',
            type: 'log',
            build: 1234,
          },
        ]
        this.CompileManager.doCompileWithLock = sinon.stub().yields(null, {
          outputFiles: this.output_files,
          stats: this.stats,
          timings: this.timings,
          buildId: this.buildId,
        })
        this.CompileController.compile(this.req, this.res)
      })

      it('should return the JSON response with status failure', function () {
        this.res.status.calledWith(200).should.equal(true)
        this.res.send
          .calledWith({
            compile: {
              status: 'failure',
              error: null,
              stats: this.stats,
              buildId: this.buildId,
              timings: this.timings,
              outputUrlPrefix: '/zone/b',
              outputFiles: this.output_files.map(file => ({
                url: `${this.Settings.apis.clsi.url}/project/${this.project_id}/build/${file.build}/output/${file.path}`,
                ...file,
              })),
            },
          })
          .should.equal(true)
      })
    })

    describe('with an error', function () {
      beforeEach(function () {
        const error = new Error((this.message = 'error message'))
        error.buildId = this.buildId
        this.CompileManager.doCompileWithLock = sinon
          .stub()
          .callsArgWith(1, error, null)
        this.CompileController.compile(this.req, this.res)
      })

      it('should return the JSON response with the error', function () {
        this.res.status.calledWith(500).should.equal(true)
        this.res.send
          .calledWith({
            compile: {
              status: 'error',
              error: this.message,
              outputUrlPrefix: '/zone/b',
              outputFiles: [],
              buildId: this.buildId,
              // JSON.stringify will omit these
              stats: undefined,
              timings: undefined,
            },
          })
          .should.equal(true)
      })
    })

    describe('with too many compile requests error', function () {
      beforeEach(function () {
        const error = new Errors.TooManyCompileRequestsError(
          'too many concurrent compile requests'
        )
        this.CompileManager.doCompileWithLock = sinon
          .stub()
          .callsArgWith(1, error, null)
        this.CompileController.compile(this.req, this.res)
      })

      it('should return the JSON response with the error', function () {
        this.res.status.calledWith(503).should.equal(true)
        this.res.send
          .calledWith({
            compile: {
              status: 'unavailable',
              error: 'too many concurrent compile requests',
              outputUrlPrefix: '/zone/b',
              outputFiles: [],
              buildId: undefined,
              stats: undefined,
              timings: undefined,
            },
          })
          .should.equal(true)
      })
    })

    describe('when the request times out', function () {
      beforeEach(function () {
        this.error = new Error((this.message = 'container timed out'))
        this.error.timedout = true
        this.CompileManager.doCompileWithLock = sinon
          .stub()
          .callsArgWith(1, this.error, null)
        this.CompileController.compile(this.req, this.res)
      })

      it('should return the JSON response with the timeout status', function () {
        this.res.status.calledWith(200).should.equal(true)
        this.res.send
          .calledWith({
            compile: {
              status: 'timedout',
              error: this.message,
              outputUrlPrefix: '/zone/b',
              outputFiles: [],
              // JSON.stringify will omit these
              buildId: undefined,
              stats: undefined,
              timings: undefined,
            },
          })
          .should.equal(true)
      })
    })

    describe('when the request returns no output files', function () {
      beforeEach(function () {
        this.CompileManager.doCompileWithLock = sinon
          .stub()
          .callsArgWith(1, null, [])
        this.CompileController.compile(this.req, this.res)
      })

      it('should return the JSON response with the failure status', function () {
        this.res.status.calledWith(200).should.equal(true)
        this.res.send
          .calledWith({
            compile: {
              error: null,
              status: 'failure',
              outputUrlPrefix: '/zone/b',
              outputFiles: [],
              // JSON.stringify will omit these
              buildId: undefined,
              stats: undefined,
              timings: undefined,
            },
          })
          .should.equal(true)
      })
    })
  })

  describe('syncFromCode', function () {
    beforeEach(function () {
      this.file = 'main.tex'
      this.line = 42
      this.column = 5
      this.project_id = 'mock-project-id'
      this.req.params = { project_id: this.project_id }
      this.req.query = {
        file: this.file,
        line: this.line.toString(),
        column: this.column.toString(),
      }
      this.res.json = sinon.stub()

      this.CompileManager.syncFromCode = sinon
        .stub()
        .yields(null, (this.pdfPositions = ['mock-positions']))
      this.CompileController.syncFromCode(this.req, this.res, this.next)
    })

    it('should find the corresponding location in the PDF', function () {
      this.CompileManager.syncFromCode
        .calledWith(
          this.project_id,
          undefined,
          this.file,
          this.line,
          this.column
        )
        .should.equal(true)
    })

    it('should return the positions', function () {
      this.res.json
        .calledWith({
          pdf: this.pdfPositions,
        })
        .should.equal(true)
    })

    tryImageNameValidation('syncFromCode', 'imageName')
  })

  describe('syncFromPdf', function () {
    beforeEach(function () {
      this.page = 5
      this.h = 100.23
      this.v = 45.67
      this.project_id = 'mock-project-id'
      this.req.params = { project_id: this.project_id }
      this.req.query = {
        page: this.page.toString(),
        h: this.h.toString(),
        v: this.v.toString(),
      }
      this.res.json = sinon.stub()

      this.CompileManager.syncFromPdf = sinon
        .stub()
        .yields(null, (this.codePositions = ['mock-positions']))
      this.CompileController.syncFromPdf(this.req, this.res, this.next)
    })

    it('should find the corresponding location in the code', function () {
      this.CompileManager.syncFromPdf
        .calledWith(this.project_id, undefined, this.page, this.h, this.v)
        .should.equal(true)
    })

    it('should return the positions', function () {
      this.res.json
        .calledWith({
          code: this.codePositions,
        })
        .should.equal(true)
    })

    tryImageNameValidation('syncFromPdf', 'imageName')
  })

  describe('wordcount', function () {
    beforeEach(function () {
      this.file = 'main.tex'
      this.project_id = 'mock-project-id'
      this.req.params = { project_id: this.project_id }
      this.req.query = {
        file: this.file,
        image: (this.image = 'example.com/image'),
      }
      this.res.json = sinon.stub()

      this.CompileManager.wordcount = sinon
        .stub()
        .callsArgWith(4, null, (this.texcount = ['mock-texcount']))
    })

    it('should return the word count of a file', function () {
      this.CompileController.wordcount(this.req, this.res, this.next)
      this.CompileManager.wordcount
        .calledWith(this.project_id, undefined, this.file, this.image)
        .should.equal(true)
    })

    it('should return the texcount info', function () {
      this.CompileController.wordcount(this.req, this.res, this.next)
      this.res.json
        .calledWith({
          texcount: this.texcount,
        })
        .should.equal(true)
    })

    tryImageNameValidation('wordcount', 'image')
  })
})
