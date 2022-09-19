pipeline {
  agent any
  options {
      skipDefaultCheckout()
  }
  stages {
    stage('Checkout') {
        steps {
          checkout([
              $class: 'GitSCM',
              branches: scm.branches,
              doGenerateSubmoduleConfigurations: false,
              extensions: [[
                  $class: 'SubmoduleOption',
                  disableSubmodules: false,
                  parentCredentials: true,
                  recursiveSubmodules: true,
                  reference: '',
                  trackingSubmodules: false
              ]],
              submoduleCfg: [],
              userRemoteConfigs: scm.userRemoteConfigs
          ])
      }
    }
    stage('Setup') {
      steps {
        nodejs(nodeJSInstallationName: '16.13.0') {
          sh 'yarn install --frozen-lockfile'
          sh 'yarn compile'
        }
      }
    }
    stage('Test Lint') {
      steps {
        nodejs(nodeJSInstallationName: '16.13.0') {
          sh 'yarn run lint'
        }
      }
    }
    stage('Test functional') {
      steps {
        nodejs(nodeJSInstallationName: '16.13.0') {
          sh 'yarn run test'
        }
      }
    }
  }
  post {
    always {
      cleanWs()
      dir("${env.WORKSPACE}@script") {
        deleteDir()
      }
    }
  }
}
